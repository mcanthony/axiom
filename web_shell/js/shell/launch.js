define(
  "shell/launch",
  ["axiom/fs/js/file_system", "axiom/fs/dom/file_system", "axiom/fs/gdrive/file_system", "axiom/fs/base/file_system_manager", "axiom/fs/base/execute_context", "axiom/fs/stdio_source", "axiom/fs/path", "shell/exe/script", "shell/service_worker", "shell/terminal", "wash/exe_modules", "exports"],
  function(
    axiom$fs$js$file_system$$,
    axiom$fs$dom$file_system$$,
    axiom$fs$gdrive$file_system$$,
    axiom$fs$base$file_system_manager$$,
    axiom$fs$base$execute_context$$,
    axiom$fs$stdio_source$$,
    axiom$fs$path$$,
    shell$exe$script$$,
    shell$service_worker$$,
    shell$terminal$$,
    wash$exe_modules$$,
    __exports__) {
    "use strict";

    function __es6_export__(name, value) {
      __exports__[name] = value;
    }

    var JsFileSystem;
    JsFileSystem = axiom$fs$js$file_system$$["default"];
    var DomFileSystem;
    DomFileSystem = axiom$fs$dom$file_system$$["default"];
    var GDriveFileSystem;
    GDriveFileSystem = axiom$fs$gdrive$file_system$$["default"];
    var FileSystemManager;
    FileSystemManager = axiom$fs$base$file_system_manager$$["default"];
    var ExecuteContext;
    ExecuteContext = axiom$fs$base$execute_context$$["default"];
    var StdioSource;
    StdioSource = axiom$fs$stdio_source$$["default"];
    var Path;
    Path = axiom$fs$path$$["default"];
    var scriptMain;
    scriptMain = shell$exe$script$$["default"];
    var ServiceWorker;
    ServiceWorker = shell$service_worker$$["default"];
    var TerminalView;
    TerminalView = shell$terminal$$["default"];
    var washExecutables;
    washExecutables = wash$exe_modules$$["default"];

    var welcomeMessage = [
      'Welcome to the Axiom web_shell sample.',
      '',
      'This is a cross-browser interactive shell written in JavaScript which ',
      'can be extended with new commands at runtime.',
      '',
      'To get started, try:',
      ' * \x1b[1mmount\x1b[m to see a list of mounted filesystems.',
      ' * \x1b[1mls\x1b[m to see the contents of the current directory.',
      ' * \x1b[1mls jsfs:/exe\x1b[m to list the executables.',
      ' * \x1b[1mcd <path>\x1b[m to change your working directory.',
      ' * \x1b[1menv-get\x1b[m, \x1b[1menv-set\x1b[m, and \x1b[1menv-del\x1b[m ' +
          'to view and modify environment variables.',
      ' * \x1b[1mscript <url>\x1b[m to load third party scripts (but be careful).',
      '',
      'For more information, please visit: \x1b[1mhttp://goo.gl/DmDqct\x1b[m',
      ''
    ].join('\r\n');

    var main = function() {
      var fsm = new FileSystemManager();
      var jsfs = new JsFileSystem(fsm, 'jsfs');
      fsm.mount(jsfs);

      // Add executables to new filesystem
      jsfs.rootDirectory.mkdir('exe')
        .then(function( /** JsDirectory */ jsdir) {
          jsdir.install({
            'script': scriptMain
          });
          jsdir.install(washExecutables);
        })
        .then(function() {
          return DomFileSystem.mount(fsm, 'html5', 'permanent')
            .then(function() {
              return DomFileSystem.mount(fsm, 'tmp', 'temporary');
            })
            .catch(function(e) {
              console.log("Error mounting DomFileSystem", e);
            });
        })
        .then(function() {
          var serviceWorker = new ServiceWorker(fsm);
          return serviceWorker.register().then(function() {
            // This starts an open messaging channel between service worker and
            // the page. The promise lifetime is the lifetime of the page so don't
            // return.
            serviceWorker.sendMessage();
          }).catch(function(e) {
            console.log('Unable to connect to service worker: ' + e);
          });
        })
        .then(function() {
          return launchHterm(fsm);
        }).catch(function(e) {
          console.log('Error lauching app:', e);
        });
    };

    __es6_export__("main", main);
    __es6_export__("default", main);

    var launchHterm = function(fsm) {
      var stdioSource = new StdioSource();
      return fsm.createExecuteContext(
        new Path('jsfs:exe/wash'), stdioSource.stdio, {})
        .then(function (/** ExecuteContext */cx) {
          var tv = new TerminalView();
          // TODO (ericarnold): We should find a better way to pass the overlay to
          // interested commands.
          stdioSource.stdio['overlay'] = tv.overlay;

          tv.println(welcomeMessage);

          cx.setEnvs({
            '@PATH': ['jsfs:/exe'],
            '$TERM': 'xterm-256color',
            '$HOME': 'html5:/',
            '$HISTFILE': 'html5:/.wash_history'
          });
          tv.execute(stdioSource, cx);
          return Promise.resolve(null);
      });
    };
  }
);

//# sourceMappingURL=launch.js.map