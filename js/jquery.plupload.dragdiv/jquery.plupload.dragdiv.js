/**
 * Как установить:
 *
 * ***************************
 * PHP:
 * ***************************
 Нужно подключить js-скрипты
 ***************************
 //pluploader
 $this->uFunc->incJs(u_sroot.'js/plupload/js/plupload.full.min.js');
 $this->uFunc->incJs(u_sroot.'js/plupload/js/i18n/ru.min.js');
 $this->uFunc->incJs(u_sroot.'js/plupload/js/jquery.plupload.dragdiv/jquery.plupload.dragdiv.min.js');
 $this->uFunc->incCss(u_sroot.'js/plupload/js/jquery.plupload.dragdiv/css/jquery.plupload.queue.css');
 //phpjs
 $this->uFunc->incJs(u_sroot.'js/php/date.js');
 //filesize
 $this->uFunc->incJs(u_sroot.'js/filesize.js/lib/filesize.min.js');

 * ***************************
 *  JS:
 * ***************************
 Нужно выполнить следующую функцию
 ***************************
 jQuery('#uploader').pluploadDragDiv({
        url: u_sroot+u_mod+'/my_drive_uploader',
        multipart_params: {
            folder_id: uDrive_my_drive.cur_folder_id,
            hash: uDrive_my_drive.sessions_hack_hash,
            hashId: uDrive_my_drive.sessions_hack_id
        },
        droparea:"uploader_file_droparea",
        init : {
            FileUploaded: function(up, file, info) {
                var response = eval('(' + info.response + ')');
                if(response['status']=='error') {
                    pnotify_fc.show_stack_bar_top('Ошибка',response['message'],"error");
                }
                else if (response['status']=='done') {
                    uDrive_my_drive.add_file2array(response);
                    uDrive_my_drive.print_page();
                }
            }
        }
 });

 На каждый window resize или отображение/скрытие/перемещение кнопки обзор (если есть такая) нужно выполнять
 ***************************
 jQuery('#uploader').pluploadDragDiv().refresh();

 Код resize:
 ***************************
 jQuery(window).resize(function(){
 });

 Также рекомендуется высоту filelist подгонять под размер окна (чтобы было куда перетаскивать, если файлов нет в папке)
 ***************************

 uDrive_my_drive.set_filelist_height=function() {
    jQuery("#uDrive_my_drive_file_li_0").css('min-height','');
    var doc_height=jQuery(document).height();
    var offset_top=jQuery("#uDrive_my_drive_file_li_0").offset().top;
    jQuery("#uDrive_my_drive_file_li_0").css('min-height',doc_height-offset_top+'px');
 }

 * ***************************
 * HTML:
 * ***************************
 * ВНИМАНИЕ!!! нельзя давать id, id+_droparea типа plupload_droparea - такой уже используется. Нужно давать например plupload_file_droparea
 <div id="uploader" class="uploader_dragdiv_wrapper"></div> - слой на самом верху - при drag-n-drop появляется
 <div id="plupload_file_droparea" style="min-height: 100%;" class="uDrive">
    <div id="uDrive_my_drive_file_list_container" class="uDrive_files_container"></div>
 </div> - Слой, куда перетаскивать. Собственно здесь обычно список файлов
 <a href="javascript:void(0)" class="btn btn-default" id="uploader_browse"><span class="icon-upload-cloud"></span>Загрузить файлы</a>
 Без кнопки "Обзор" не работает!:
 ***************************

 * Обратите внимание. По умолчанию устанавливаются следующие настройки:
 ***************************
 runtimes='html5,flash,silverlight,html4';
 flash_swf_url='js/plupload/js/Moxie.swf';
 silverlight_xap_url='js/plupload/js/Moxie.xap';
 max_file_size='2048mb';
 chunk_size='900kb';
 unique_names=false;
 droparea_fullscreen=false;//Отображать droparea на весь экран или подстраивать под контейнер
*/
;(function($, o) {
	var uploaders = {};

	function _(str) {
		return plupload.translate(str) || str;
	}

	function renderUI(id, target) {
		// Remove all existing non plupload items
		target.contents().each(function(i, node) {
			node = $(node);

			if (!node.is('.plupload')) {
				node.remove();
			}
		});
        target.after(
            '<div id="' + id + '_filelist_dg" class="' + id + '_filelist_dg uploader_dragdiv_filelist_dg" style="display:none; max-height: 90%; z-index:66002">' +
                '<div class="modal-dialog">' +
                    '<div class="modal-content">' +
                        '<div class="modal-header">' +
                            '<button id="' + id + '_filelist_dg_close_btn" type="button" class="close"><span aria-hidden="true">&times;</span><span class="sr-only">Close</span></button>' +
                            '<h4 class="modal-title" id="' + id + '_filelist_dgLabel">Файлы загружаются</h4>' +
                        '</div>' +
                        '<div class="modal-body" id="' + id + '_filelist_dg_body">' +
                            '<div class="plupload_dragdiv_progress">' +
                                '<div class="plupload_dragdiv_progress_container">' +
                                    '<div class="progress">' +
                                        '<div class="progress-bar plupload_total_progress_bar progress-bar-striped active progress-bar-success" role="progressbar" aria-valuenow="0" aria-valuemin="0" aria-valuemax="100" style="width: 0%;">&nbsp;</div>' +
                                '</div>' +
                            '</div>' +
                            '<div class="plupload_dragdiv_filelist_footer">' +
                                '<div class="plupload_dragdiv_file_name">' +
                                        '<span class="plupload_dragdiv_upload_status"></span>' +
                                    '</div>' +
                                    '<div class="plupload_dragdiv_file_action"></div>' +
                                    '<div class="plupload_dragdiv_file_size"><span class="plupload_total_file_size">0</span></div>' +
                                '</div>' +
                                '<div class="clearfix">&nbsp;</div>' +
                            '</div>' +
                            '<ul id="' + id + '_filelist" class="plupload_dragdiv_filelist"></ul>' +
                        '</div>' +
                    '</div>' +
                '</div>' +
            '</div>'
        );

		target.prepend(
			'<div class="plupload_dragdiv_wrapper plupload_dragdiv_scroll" style="width:100%; height: 100%">' +
				'<div id="' + id + '_container" class="plupload_dragdiv_container" style="width:100%; height: 100%">' +
					'<div style="width:100%; height: 100%">' +
						'<div class="plupload_dragdiv_content" style="width:100%; height: 100%">' +
							'<ul id="' + id + '_droparea" class="plupload_dragdiv_droparea" style="width:100%; height: 100%"></ul>' +
						'</div>' +
					'</div>' +
				'</div>' +
				'<input type="hidden" id="' + id + '_count" name="' + id + '_count" value="0" />' +
			'</div>'
		);

        jQuery('#' + id + '_filelist_dg_close_btn').click(function(){
            jQuery('#'+id).pluploadDragDiv().splice();
            jQuery("#"+id+"_filelist_dg").hide("slide", { direction: "right", easing: "easeOutBounce" },1200, function(){});
        });
	}

    function renderDropArea(id,settings) {
        jQuery(settings.droparea).on({
            dragenter: function(e) {
                if(!settings.droparea_fullscreen) {
                    var offset = jQuery(settings.droparea).offset();
                    var width = jQuery(settings.droparea).width();
                    var height = jQuery(settings.droparea).width();
                    jQuery("#"+id).css('left',offset.left).css('top',offset.top).css('width',width+'px').css('height',height+'px');
                }
                else {
                    jQuery("#"+id).css('left','0').css('top','0').css('width','100%').css('height','100%');
                }
                jQuery("#"+id+' .plupload_dragdiv_droptext').show();
            }
        });
        jQuery('#'+id).on({
            dragleave: function(e) {
                jQuery("#"+id).css('left',0).css('top',0).css('width','1px').css('height','1px');
                jQuery("#"+id+' .plupload_dragdiv_droptext').hide();
            },
            drop: function(e) {
                jQuery("#"+id).css('left',0).css('top',0).css('width','1px').css('height','1px');
                jQuery("#"+id+' .plupload_dragdiv_droptext').hide();

                e.stopPropagation();
                e.preventDefault();
            }
        });
    }

	$.fn.pluploadDragDiv = function(settings) {
		if (settings) {
			this.each(function() {
				var uploader, target, id, contents_bak;

				target = $(this);
				id = target.attr('id');

				if (!id) {
					id = plupload.guid();
					target.attr('id', id);
				}

				contents_bak = target.html();
				renderUI(id, target);

				settings = $.extend({
					dragdrop : true,
					browse_button : id + '_browse',
					container : id,
                    droparea:'#'+id+'_file_droparea',
                    droparea_fullscreen:false
				}, settings);

                if(typeof settings.runtimes === 'undefined') settings.runtimes='html5,flash,silverlight,html4';
                if(typeof settings.flash_swf_url === 'undefined') settings.flash_swf_url='js/plupload/js/Moxie.swf';
                if(typeof settings.silverlight_xap_url === 'undefined') settings.silverlight_xap_url='js/plupload/js/Moxie.xap';
                if(typeof settings.max_file_size === 'undefined') settings.max_file_size='2048mb';
                if(typeof settings.chunk_size === 'undefined') settings.chunk_size='900kb';
                if(typeof settings.unique_names === 'undefined') settings.unique_names=false;

                renderDropArea(id,settings);

				// Enable drag/drop (see PostInit handler as well)
				if (settings.dragdrop) {
					settings.drop_element = id + '_droparea';
				}

				uploader = new plupload.Uploader(settings);

				uploaders[id] = uploader;

				function handleStatus(file) {
					var actionClass;

					if (file.status == plupload.DONE) {
						actionClass = 'plupload_dragdiv_done';
					}

					if (file.status == plupload.FAILED) {
						actionClass = 'plupload_dragdiv_failed';
					}

					if (file.status == plupload.QUEUED) {
						actionClass = 'plupload_dragdiv_delete';
					}

					if (file.status == plupload.UPLOADING) {
						actionClass = 'plupload_dragdiv_uploading';
					}

					var icon = $('#' + file.id).attr('class', actionClass + ' clearfix').find('a').css('display', 'block');
					if (file.hint) {
						icon.attr('title', file.hint);	
					}
				}

				function updateTotalProgress() {
					$('div.plupload_total_progress_bar').css('width', uploader.total.percent + '%');
					$('span.plupload_dragdiv_upload_status').html(
						o.sprintf(_('Uploaded %d/%d files'), uploader.total.uploaded, uploader.files.length)
					);
				}

				function updateList() {
                    jQuery('#' + id + '_filelist_dgLabel').html('Загрузка файлов...');
					var fileList = $('#' + id + '_filelist').html(''), inputCount = 0, inputHTML;

					$.each(uploader.files, function(i, file) {
						inputHTML = '';

						if (file.status == plupload.DONE) {
							if (file.target_name) {
								inputHTML += '<input type="hidden" name="' + id + '_' + inputCount + '_tmpname" value="' + plupload.xmlEncode(file.target_name) + '" />';
							}

							inputHTML += '<input type="hidden" name="' + id + '_' + inputCount + '_name" value="' + plupload.xmlEncode(file.name) + '" />';
							inputHTML += '<input type="hidden" name="' + id + '_' + inputCount + '_status" value="' + (file.status == plupload.DONE ? 'done' : 'failed') + '" />';
	
							inputCount++;

							$('#' + id + '_count').val(inputCount);
						}

						fileList.prepend(
							'<li id="' + file.id + '" class="clearfix ui-state-default plupload_dragdiv_delete">' +
								'<a class="plupload_dragdiv_delete"></a>' +
								'<div class="plupload_dragdiv_file_action"><a href="#"></a></div>' +
                                '<div class="plupload_dragdiv_file_name"><span>' + file.name + '</span></div>' +
                                '<div class="plupload_dragdiv_file_size">' + plupload.formatSize(file.size) + '</div>' +
                                '<div class="progress">' +
                                    '<div class="progress-bar progress-bar-striped active" role="progressbar" aria-valuenow="0" aria-valuemin="0" aria-valuemax="100" style="width: 0%;">&nbsp;</div>' +
                                '</div>' +
								inputHTML +
							'</li>'
						);

						handleStatus(file);

						$('#' + file.id + '.plupload_dragdiv_delete a').click(function(e) {
							$('#' + file.id).remove();
							uploader.removeFile(file);

							e.preventDefault();
						});
					});

					$('span.plupload_total_file_size').html(plupload.formatSize(uploader.total.size));

					if (uploader.total.queued === 0) {
						$('span.plupload_add_text').html(_('Add Files'));
					} else {
						$('span.plupload_add_text').html(o.sprintf(_('%d files queued'), uploader.total.queued));
					}
					// Scroll to end of file list
					fileList[0].scrollTop = fileList[0].scrollHeight;

					updateTotalProgress();
				}

				function destroy() {
					delete uploaders[id];
					uploader.destroy();
					target.html(contents_bak);
					uploader = target = contents_bak = null;
				}

				uploader.bind("UploadFile", function(up, file) {
					$('#' + file.id).addClass('plupload_current_file');
				});

				uploader.bind('Init', function(up, res) {
					// Enable rename support
					if (!settings.unique_names && settings.rename) {
						target.on('click', '#' + id + '_filelist div.plupload_dragdiv_file_name span', function(e) {
							var targetSpan = $(e.target), file, parts, name, ext = "";

							// Get file name and split out name and extension
							file = up.getFile(targetSpan.parents('li')[0].id);
							name = file.name;
							parts = /^(.+)(\.[^.]+)$/.exec(name);
							if (parts) {
								name = parts[1];
								ext = parts[2];
							}

							// Display input element
							targetSpan.hide().after('<input type="text" />');
							targetSpan.next().val(name).focus().blur(function() {
								targetSpan.show().next().remove();
							}).keydown(function(e) {
								var targetInput = $(this);

								if (e.keyCode == 13) {
									e.preventDefault();

									// Rename file and glue extension back on
									file.name = targetInput.val() + ext;
									targetSpan.html(file.name);
									targetInput.blur();
								}
							});
						});
					}

					$('#' + id + '_container').attr('title', 'Using runtime: ' + res.runtime);

					$('a.plupload_stop').click(function(e) {
						e.preventDefault();
						uploader.stop();
					});
				});

                uploader.bind('FilesAdded', function(up, files) {
                    uploader.start();
                    jQuery('#' + id + '_filelist_dg').show();
                });

				uploader.bind("Error", function(up, err) {
					var file = err.file, message;

					if (file) {
						message = err.message;

						if (err.details) {
							message += " (" + err.details + ")";
						}

						if (err.code == plupload.FILE_SIZE_ERROR) {
							alert(_("Error: File too large:") + " " + file.name);
						}

						if (err.code == plupload.FILE_EXTENSION_ERROR) {
							alert(_("Error: Invalid file extension:") + " " + file.name);
						}
						
						file.hint = message;
						$('#' + file.id).attr('class', 'plupload_dragdiv_failed').find('a').css('display', 'block').attr('title', message);
					}

					if (err.code === plupload.INIT_ERROR) {
						setTimeout(function() {
							destroy();
						}, 1);
					}
				});

				uploader.bind("PostInit", function(up) {
					// features are populated only after input components are fully instantiated
					if (up.settings.dragdrop && up.features.dragdrop) {
                        $('#' + id + '_droparea').append('<li><button class="btn btn-sm btn-default pull-right" onclick="jQuery(\'#'+id+'\').css(\'left\',0).css(\'top\',0).css(\'width\',\'1px\').css(\'height\',\'1px\')"><span class="glyphicon glyphicon-remove"></span></button></li>');
						$('#' + id + '_droparea').append('<li class="plupload_dragdiv_droptext"><span class="icon-upload-cloud"></span></li>');
					}
				});

				uploader.init();

				uploader.bind('StateChanged', function() {
					if (uploader.state === plupload.STARTED) {
						$('li.plupload_dragdiv_delete a').hide();

						$('span.plupload_dragdiv_upload_status,div.plupload_dragdiv_progress,a.plupload_stop').css('display', 'block');
						$('span.plupload_dragdiv_upload_status').html('Uploaded ' + uploader.total.uploaded + '/' + uploader.files.length + ' files');

						if (settings.multiple_queues) {
							$('span.plupload_total_status,span.plupload_total_file_size').show();
						}
					} else {
						updateList();
						$('a.plupload_stop,div.plupload_dragdiv_progress').hide();
						$('a.plupload_dragdiv_delete').css('display', 'block');

						if (settings.multiple_queues && uploader.total.uploaded + uploader.total.failed == uploader.files.length) {
							$(".plupload_dragdiv_upload_status").css("display", "inline");

							$('span.plupload_total_status,span.plupload_total_file_size').hide();
						}
					}
				});

				uploader.bind('FilesAdded', updateList);
				uploader.bind('UploadComplete', function() {
                    jQuery('#' + id + '_filelist_dgLabel').html('Загрузка завершена');
                    setTimeout('jQuery("#'+id+'_filelist_dg").hide("slide", { direction: "right", easing: "easeOutBounce" },1200, function(){}); jQuery("#'+id+'").pluploadDragDiv().splice();',2000);
                });

				uploader.bind('FilesRemoved', function() {
					// since the whole file list is redrawn for every change in the queue
					// we need to scroll back to the file removal point to avoid annoying
					// scrolling to the bottom bug (see #926)
					var scrollTop = $('#' + id + '_filelist').scrollTop();
					updateList();
					$('#' + id + '_filelist').scrollTop(scrollTop);
				});

				uploader.bind('FileUploaded', function(up, file) {
					handleStatus(file);
				});

				uploader.bind("UploadProgress", function(up, file) {
					// Set file specific progress
					$('#' + file.id + ' div.progress-bar').css('width',file.percent + '%');

					handleStatus(file);
					updateTotalProgress();
				});

				// Call setup function
				if (settings.setup) {
					settings.setup(uploader);
				}
			});

			return this;
		} else {
			// Get uploader instance for specified element
			return uploaders[$(this[0]).attr('id')];
		}
	};
})(jQuery, mOxie);
