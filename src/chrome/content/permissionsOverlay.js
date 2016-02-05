var CookieExFilter = {
	initialised : false,
	prefService : null,
	prefs : { // This will hold prefs
		useFilter : true,
		filterDelay : 500,
		allowRegExp : false,
		useGlobSyntax : false,
		selectWhenFound : true,
		focusWhenFound : false,
		searchCookies : true, // Instances for search bar
		searchPopups : true,
		searchImages : true,
		searchUnknown : false,
		contextCookies : true, // Instances for context menu
		contextPopups : true,
		contextImages : true,
		contextUnknown : false
	},
	getPrefs : function(){ // This gets the prefs, fire on init (or on pref updated?)
		this.prefs.useFilter = this.prefService.getBoolPref('extensions.cookieexfilter.useFilter');
		this.prefs.filterDelay = this.prefService.getIntPref('extensions.cookieexfilter.filterDelay');
		this.prefs.allowRegExp = this.prefService.getBoolPref('extensions.cookieexfilter.allowRegExp');
		this.prefs.useGlobSyntax = this.prefService.getBoolPref('extensions.cookieexfilter.useGlobSyntax');
		this.prefs.selectWhenFound = this.prefService.getBoolPref('extensions.cookieexfilter.selectWhenFound');
		this.prefs.focusWhenFound = this.prefService.getBoolPref('extensions.cookieexfilter.focusWhenFound');
		
		this.prefs.searchCookies = this.prefService.getBoolPref('extensions.cookieexfilter.searchCookies');
		this.prefs.searchPopups = this.prefService.getBoolPref('extensions.cookieexfilter.searchPopups');
		this.prefs.searchImages = this.prefService.getBoolPref('extensions.cookieexfilter.searchImages');
		this.prefs.searchUnknown = this.prefService.getBoolPref('extensions.cookieexfilter.searchUnknown');
		
		this.prefs.contextCookies = this.prefService.getBoolPref('extensions.cookieexfilter.contextCookies');
		this.prefs.contextPopups = this.prefService.getBoolPref('extensions.cookieexfilter.contextPopups');
		this.prefs.contextImages = this.prefService.getBoolPref('extensions.cookieexfilter.contextImages');
		this.prefs.contextUnknown = this.prefService.getBoolPref('extensions.cookieexfilter.contextUnknown');
	},
	contextMenu : null,
	appendContextMenu : function(params, textObject){ // This adds a context menu to the tree
		var popupset = document.createElement('popupset'),
		    menupopup = document.createElement('menupopup'),
		    itemNames = document.createElement('menuitem'),
		    separator = document.createElement('menuseparator'),
		    itemBlock = document.createElement('menuitem'),
		    itemSession = document.createElement('menuitem'),
		    itemAllow = document.createElement('menuitem');
		menupopup.id = 'CookieExFilter_Context';
		itemNames.setAttribute('crop', 'right');
		itemNames.setAttribute('default', 'true');
		itemNames.setAttribute('label', '');
		itemBlock.setAttribute('label', textObject.block);
		itemSession.setAttribute('label', textObject.session);
		itemAllow.setAttribute('label', textObject.allow);
		itemNames.addEventListener('command', function(){CookieExFilter.applyContextMenu(0);}, false);
		itemBlock.addEventListener('command', function(){CookieExFilter.applyContextMenu(1);}, false);
		itemSession.addEventListener('command', function(){CookieExFilter.applyContextMenu(2);}, false);
		itemAllow.addEventListener('command', function(){CookieExFilter.applyContextMenu(3);}, false);
		menupopup.addEventListener('popupshowing', function(){CookieExFilter.updateContextMenu();}, false);
		menupopup.appendChild(itemNames);
		menupopup.appendChild(separator);
		menupopup.appendChild(itemBlock);
		menupopup.appendChild(itemSession);
		menupopup.appendChild(itemAllow);
		popupset.appendChild(menupopup);
		if(params.sessionVisible === false){ // Don't display session option in some cases
			itemSession.setAttribute('disabled', 'true');
			itemSession.setAttribute('hidden', 'true');
		}
		this.contextMenu = {menu : menupopup, names : itemNames, block : itemBlock, session : itemSession, allow : itemAllow, selection : []};
		document.getElementById('PermissionsDialog').appendChild(popupset);
		document.getElementById('permissionsTree').setAttribute('context', 'CookieExFilter_Context');
	},
	updateContextMenu : function(){ // Update the context menu with relevant info
		var menu = this.contextMenu, g = gPermissionManager;
		menu.selection = g._tree.view.selection;
		menu.names.setAttribute('disabled', 'true');
		if(menu.selection.count === 0) menu.names.setAttribute('label', '');
		else if(menu.selection.count === 1){
			menu.names.setAttribute('label', g._permissions[g._tree.currentIndex].origin);
			menu.names.setAttribute('disabled', 'false');
		}else menu.names.setAttribute('label', '(' + menu.selection.count.toString(10) + ')');
	},
	actionContextMenu : function(selection, capability){ // Do the action of pressing the buttons, except on the selections rather than url box
		var g = gPermissionManager,
		    rc = selection.getRangeCount(),
		    i = 0, j = 0, min = {}, max = {},
		    host = '', uri = null, capabilityString = '',
		    ioService = null, promptService = null,
		    updatePM = true;
		try{  // Now rewrite of gPermissionManager.addPermission, looping over selection
			ioService = Services.io; // Components.classes['@mozilla.org/network/io-service;1'].getService(Components.interfaces.nsIIOService);
			for(i = 0; i < rc; i++){
				min = {};
				max = {};
				selection.getRangeAt(i, min, max);
				for(j = min.value; j <= max.value; j++){
					updatePM = true;
					if(g._permissions[j].perm === capability) updatePM = false;
					host = g._permissions[j].origin; // .replace(/^\s*([-\w]*:\/+)?/, '');
					uri = ioService.newURI(/*'http://'+*/host, null, null);
					host = uri.host;
					if (updatePM) {
						//host = (host.charAt(0) == '.') ? host.substring(1,host.length) : host;
						uri = ioService.newURI(/*'http://' + */host, null, null);
						g._pm.add(uri, g._type, capability);
					}
				}
			}
		} catch(ex) {
			promptService = Services.prompt; // Components.classes['@mozilla.org/embedcomp/prompt-service;1'].getService(Components.interfaces.nsIPromptService);
            promptService.alert(window, g._bundle.getString('invalidURITitle'), g._bundle.getString('invalidURI'));
            return;
		}
	},
	applyContextMenu : function(i){ // As most buttons share code, this enables them to do that
		var menu = this.contextMenu, choice = '', url = null;
		if(i === 0){
			url = document.getElementById('url');
			url.value = menu.names.getAttribute('label');
			gPermissionManager.onHostInput(url);
		}
		else if(i === 1) choice = nsIPermissionManager.DENY_ACTION;
		else if(i === 2) choice = nsICookiePermission.ACCESS_SESSION;
		else if(i === 3) choice = nsIPermissionManager.ALLOW_ACTION;
		if(choice !== '') this.actionContextMenu(menu.selection, choice);
	},
	searchBox : null,
	appendSearchBox : function(textObject){ // This adds the search box to the window (can't put it where I want using XUL overlay)
		var box = document.createElement('hbox'),
		    tex = document.createElement('textbox'),
				sep = document.createElement('separator'),
				sib = document.getElementById('permissionsTree');
		box.id = 'CookieExFilter_Box';
		tex.id = 'CookieExFilter_Value';
		tex.setAttribute('type', 'search');
		tex.setAttribute('placeholder', textObject.placeholder);
		tex.setAttribute('flex', '1');
		tex.setAttribute('timeout', this.prefs.filterDelay);
		tex.addEventListener('command', function(){CookieExFilter.action();}, false);
		box.appendChild(tex);
		sep.setAttribute('class', 'thin');
		sib.parentNode.insertBefore(box, sib);
		sib.parentNode.insertBefore(sep, sib);
		this.searchBox = tex;
	},
	last : '',
	lastWasFound : true,
	prepareRegEx : function(plain){
		var encoded = plain,
		    allowRegExp = this.prefs.allowRegExp,
		    useGlobSyntax = this.prefs.useGlobSyntax;
		if(allowRegExp === false && useGlobSyntax === false) return null; // We will be using indexOf in this instance
		if(allowRegExp === false) encoded = encoded.replace(/(\\|\.|\?|\*|\+|\^|\$|\[|\]|\(|\)|\{|\})/g,'\\$1'); // Escape RegExp
		if(useGlobSyntax === true){
			if(allowRegExp === false) encoded = encoded.replace(/\\\?/g,'.').replace(/\\\*/g,'.*'); // Unescape if escaped
			else encoded = encoded.replace(/\?/g,'.').replace(/\*/g,'.*'); // Glob -> RegExp
		}
		return new RegExp(encoded);
	},
	permissionsCache : [],
	sortCache : function(){
		this.permissionsCache.sort(function (a, b) { return a.origin.toLowerCase().localeCompare(b.origin.toLowerCase()); });
	},
	addToCache : function(aPermission){
		var g = gPermissionManager, principal = null, capabilityString = null, p = null;
		if(aPermission.type == g._type && (!g._manageCapability || (aPermission.capability == g._manageCapability))){
			principal = aPermission.principal;
			capabilityString = g._getCapabilityString(aPermission.capability);
			p = new Permission(principal, aPermission.type, capabilityString);
			this.permissionsCache.push(p);
		}
	},
	makeCache : function(){ // Rewrite of default from _loadPermissions, chrome://browser/content/preferences/permissions.js
		var enumerator = null, permission = null;
		this.permissionsCache = [];
		enumerator = Services.perms.enumerator; // gPermissionManager._pm.enumerator;
		while(enumerator.hasMoreElements()){
			permission = enumerator.getNext().QueryInterface(Components.interfaces.nsIPermission);
			this.addToCache(permission);
		}
		this.sortCache();
	},
	filter : function(force){ // Apply Filter
		if(false === this.initialised) return; // But not if we haven't used init()
		var filter_plain = this.searchBox.value,
		    re = null, i = 0, permissionCount = 0,
		    g = gPermissionManager;
		if(filter_plain === this.last && force === undefined) return; // No action needed
		else{ // Need custom load-in
			if(this.permissionsCache.length === 0) this.makeCache();
			g._permissions = [];
			permissionCount = this.permissionsCache.length;
			if(filter_plain === ''){ // If no filter, display everything
				for(i = 0; i < permissionCount; i++){
					g._permissions.push(this.permissionsCache[i]);
				}
			}else{ // Else check for what we want to display
				re = this.prepareRegEx(filter_plain);
				if(re === null){ // indexOf
					for(i = 0; i < permissionCount; i++){
						if(this.permissionsCache[i].origin.indexOf(filter_plain) !== -1) g._permissions.push(this.permissionsCache[i]);
					}
				}else{ // RegEx/Glob
					for(i = 0; i < permissionCount; i++){
						if(re.test(this.permissionsCache[i].origin)) g._permissions.push(this.permissionsCache[i]);
					}
				}
			}
			g._view._rowCount = g._permissions.length;
			g._tree.treeBoxObject.view = g._view; // Re-draw tree
			gTreeUtils.sort(g._tree, g._view, g._permissions, g._lastPermissionSortColumn, g._lastPermissionSortAscending);
			if(g._permissions.length === 0) document.getElementById('removeAllPermissions').disabled = true; // disable "remove all" button if there are none
			else document.getElementById('removeAllPermissions').disabled = false;
		}
		this.last = filter_plain;
	},
	scroll : function(){ // Scroll Down
		if(false === this.initialised) return; // But not if we haven't used init()
		var rowCount = gPermissionManager._view._rowCount,
		    filter_plain = this.searchBox.value,
		    tree = document.getElementById('permissionsTree'),
		    view = tree.view,
		    i = 0, j = 0, k = 0,
		    found = false,
		    re = null,
		    returnKey = false,
		    g = gPermissionManager,
		    selectWhenFound = this.prefs.selectWhenFound, // Copy over prefs
		    focusWhenFound = this.prefs.focusWhenFound;
		if(this.last === filter_plain) returnKey = true; // Return (or equiv) must have been pressed to fire 'command'
		this.last = filter_plain;
		j = tree.currentIndex || 0;
		if(returnKey) j = j + 1; // Don't find same again if we pressed enter (unless no other result)
		if(filter_plain === ''){
			if(returnKey) k = ( j + 1 ) % rowCount; // Just cycle through if blank input and pressed return
			else return; // Otherwise text was simply removed so go nowhere
			found = true;
		}else{
			re = this.prepareRegEx(filter_plain);
			if(re === null){ // indexOf
				for(i = 0; i < rowCount; i++){
					k = ( i + j ) % rowCount; // Start from current selection rather than 1st row
					if(g._permissions[k].origin.indexOf(filter_plain) !== -1) {
						found = true;
						break;
					}
				}
			}else{ // RegEx/Glob
				for(i = 0; i < rowCount; i++){
					k = ( i + j ) % rowCount; // Start from current selection rather than 1st row
					if(re.test(g._permissions[k].origin)) {
						found = true;
						break;
					}
				}
			}
		}
		if(found){ // Found something, scroll to it
			if(false === this.lastWasFound) this.searchBox.style.color = '';
			if(selectWhenFound) view.selection.select(k);
			tree.treeBoxObject.scrollToRow(k);
			tree.treeBoxObject.ensureRowIsVisible(k);
			if(focusWhenFound) tree.focus();
		}else{ // alert('"' + filter_plain + '" not found.');
			if(this.lastWasFound) this.searchBox.style.color = '#FF0000';
		}
		this.lastWasFound = found;
	},
	action : function(){
		if(this.prefs.useFilter) CookieExFilter.filter();
		else this.scroll();
	},
	observe : function(aSubject, aTopic, aData){
		var permission = null, i = 0, permissionCount = 0;
		if(aTopic === 'perm-changed'){
			permission = aSubject.QueryInterface(Components.interfaces.nsIPermission);
      if(aData === 'added'){
				this.addToCache(permission);
        this.sortCache();    
      }else if(aData === 'changed'){
				permissionCount = this.permissionsCache.length;
				for(i = 0; i < permissionCount; i++){
          if(this.permissionsCache[i].host === permission.host){
            this.permissionsCache[i].capability = gPermissionManager._getCapabilityString(permission.capability);
            break;
          }
        } 
      }else if(aData === 'deleted'){
				permissionCount = this.permissionsCache.length;
				for(i = 0; i < permissionCount; i++){
          if(this.permissionsCache[i].host === permission.host){
            this.permissionsCache.splice(i, 1);
            break;
          }
        } 
			}
    }
	},
	observerAdded : false,
	removeObserver : function (){
		var os = Components.classes['@mozilla.org/observer-service;1'].getService(Components.interfaces.nsIObserverService);
    os.removeObserver(this, 'perm-changed');
		this.observerAdded = false;
  },
	addObserver : function (){
		if(this.observerAdded) this.removeObserver();
		var os = Components.classes['@mozilla.org/observer-service;1'].getService(Components.interfaces.nsIObserverService);
    os.addObserver(this, 'perm-changed', false);
		this.observerAdded = true;
  },
	_loadPermissions : function(){ // function to overload gPermissionManager._loadPermissions for improved speed
		var g = gPermissionManager;
		g._tree = document.getElementById('permissionsTree');
		g._permissions = [];
		g._lastPermissionSortColumn = 'statusCol'; // statusCol, siteCol
		CookieExFilter.filter(true);
	},
	init_observer : function(){
		window.addEventListener('unload',function(){CookieExFilter.removeObserver();},false);
		this.addObserver();
	},
	init_search : function(params, textObject){
		if(params.permissionType === 'cookie'){
			if(this.prefs.searchCookies === false) return false;
		}else if(params.permissionType === 'popup'){
			if(this.prefs.searchPopups === false) return false;
		}else if(params.permissionType === 'image'){
			if(this.prefs.searchImages === false) return false;
		}else{
			if(this.prefs.searchUnknown === false) return false; // don't apply for unknown permissionType unless chosen in about:config
		}
		this.appendSearchBox(textObject);
		return true;
	},
	init_context : function(params, textObject){
		if(params.permissionType === 'cookie'){
			if(this.prefs.contextCookies === false) return false;
		}else if(params.permissionType === 'popup'){
			if(this.prefs.contextPopups === false) return false;
		}else if(params.permissionType === 'image'){
			if(this.prefs.contextImages === false) return false;
		}else{
			if(this.prefs.contextUnknown === false) return false; // don't apply for unknown permissionType unless chosen in about:config
		}
		this.appendContextMenu(params, textObject);
		return true;
	},
	init : function(textObject){ // Must pass dtd strings from the .xul to make localisation show up properly
		var params = window.arguments[0], searchEnabled = false, contextEnabled = false;
		this.prefService = Components.classes['@mozilla.org/preferences-service;1'].getService(Components.interfaces.nsIPrefBranch);
		this.getPrefs();
		searchEnabled = this.init_search(params, textObject);
		contextEnabled = this.init_context(params, textObject);
		if(searchEnabled){
			if(this.prefs.useFilter){
				this.init_observer();
				gPermissionManager._loadPermissions = function(){CookieExFilter._loadPermissions();}; // As we're builing a cache, just use it in rather than default load
			}
		}
		this.initialised = true;
	}
};