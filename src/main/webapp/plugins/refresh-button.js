/**
 * Plugin Refresh Button pour Draw.io Desktop
 * Ajoute un bouton de rafraîchissement dans la barre d'outils
 */
Draw.loadPlugin(function(ui) {
	// Vérifier si nous sommes dans l'application Electron
	const isElectron = typeof window !== 'undefined' && window.process && window.process.type === 'renderer';
	
	if (!isElectron) {
		console.log('Refresh button plugin: Not running in Electron, skipping...');
		return;
	}

	// Fonction de rafraîchissement
	function refreshApp() {
		try {
			console.log('Refresh button clicked - sending reload-app event');
			// Envoyer l'événement IPC à Electron pour recharger l'application
			if (window.electron && window.electron.sendMessage) {
				window.electron.sendMessage('reload-app');
			} else {
				console.error('Electron API not available');
				// Fallback sur le rechargement standard si IPC échoue
				window.location.reload();
			}
		} catch (error) {
			console.error('Error sending reload-app event:', error);
			// Fallback sur le rechargement standard si IPC échoue
			window.location.reload();
		}
	}

	// Ajouter un bouton pour recharger l'application dans la barre d'outils
	if (ui.toolbar != null) {
		// Créer un séparateur
		var elt = ui.toolbar.addSeparator();
		
		// Créer le bouton de rafraîchissement
		var button = mxUtils.button('🔄', function(evt) {
			// Confirmer avant de recharger si des modifications non sauvegardées existent
			if (ui.editor.modified) {
				ui.confirm(mxResources.get('allChangesLost', null, 'All changes will be lost'), function() {
					refreshApp();
				});
			} else {
				refreshApp();
			}
		});
		
		button.setAttribute('title', mxResources.get('refresh', null, 'Refresh Application'));
		button.style.cssText = 'display:inline-block;padding:4px 8px;font-size:16px;cursor:pointer;background:#f5f5f5;color:#333;border:1px solid #ccc;border-radius:3px;margin:2px;';
		
		// Ajouter un effet hover
		button.onmouseover = function() {
			this.style.background = '#e0e0e0';
		};
		button.onmouseout = function() {
			this.style.background = '#f5f5f5';
		};
		
		ui.toolbar.container.appendChild(button);
		
		console.log('Refresh button added to toolbar successfully');
	}

	// Créer l'action de rafraîchissement pour le menu et le raccourci clavier
	var refreshAction = new Action('Refresh', function() {
		// Confirmer avant de recharger si des modifications non sauvegardées existent
		if (ui.editor.modified) {
			ui.confirm(mxResources.get('allChangesLost', null, 'All changes will be lost'), function() {
				refreshApp();
			});
		} else {
			refreshApp();
		}
	});

	// Ajouter l'action au menu (optionnel)
	if (ui.menus) {
		ui.menus.addMenuItems(ui.menus.get('file'), ['-', 'refresh'], null, null);
		
		// Ajouter l'action au registre des actions
		ui.actions.put('refresh', refreshAction);
	}

	// Raccourci clavier optionnel (Ctrl+R ou Cmd+R)
	if (ui.keyHandler) {
		ui.keyHandler.bindAction(82, true, 'refresh'); // 82 = touche R
	}
	
	console.log('Refresh button plugin loaded successfully');
});
