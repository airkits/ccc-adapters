const inputManager = cc.internal.inputManager;
const renderer = cc.renderer;
const game = cc.game;

Object.assign(game, {
    setFrameRate (frameRate) {
        this.config.frameRate = frameRate;
        if (__globalAdapter.setPreferredFramesPerSecond) {
            __globalAdapter.setPreferredFramesPerSecond(frameRate);
        }
        else {
            if (this._intervalId) {
                window.cancelAnimFrame(this._intervalId);
            }
            this._intervalId = 0;
            this._paused = true;
            this._setAnimFrame();
            this._runMainLoop();
        }
    },

    _runMainLoop () {
        var self = this, callback, config = self.config,
            director = cc.director,
            skip = true, frameRate = config.frameRate;

        cc.debug.setDisplayStats(config.showFPS);

        callback = function () {
            if (!self._paused) {
                self._intervalId = window.requestAnimFrame(callback);
                if (frameRate === 30  && !__globalAdapter.setPreferredFramesPerSecond) {
                    skip = !skip;
                    if (skip) {
                        return;
                    }
                }
                director.mainLoop();
            }
        };

        self._intervalId = window.requestAnimFrame(callback);
        self._paused = false;
    },

    _initRenderer () {
        // Avoid setup to be called twice.
        if (this._rendererInitialized) return;

        // frame and container are useless on minigame platform
        this.frame = this.container = document.createElement("DIV");

        let localCanvas;
        if (__globalAdapter.isSubContext) {
            localCanvas = window.sharedCanvas || __globalAdapter.getSharedCanvas();
        }
        else {
            localCanvas = canvas;
        }
        this.canvas = localCanvas;

        this._determineRenderType();
        // WebGL context created successfully
        if (this.renderType === this.RENDER_TYPE_WEBGL) {
            var opts = {
                'stencil': true,
                // MSAA is causing serious performance dropdown on some browsers.
                'antialias': cc.macro.ENABLE_WEBGL_ANTIALIAS,
                'alpha': cc.macro.ENABLE_TRANSPARENT_CANVAS,
                'preserveDrawingBuffer': false,
            };
            renderer.initWebGL(localCanvas, opts);
            this._renderContext = renderer.device._gl;

            // Enable dynamic atlas manager by default
            if (!cc.macro.CLEANUP_IMAGE_CACHE && dynamicAtlasManager) {
                dynamicAtlasManager.enabled = true;
            }
        }
        if (!this._renderContext) {
            this.renderType = this.RENDER_TYPE_CANVAS;
            // Could be ignored by module settings
            renderer.initCanvas(localCanvas);
            this._renderContext = renderer.device._ctx;
        }

        this._rendererInitialized = true;
    },

    _initEvents () {
        // register system events
        if (this.config.registerSystemEvent) {
            inputManager.registerSystemEvent(this.canvas);
        }

        var hidden = false;

        function onHidden() {
            if (!hidden) {
                hidden = true;
                game.emit(game.EVENT_HIDE);
            }
        }

        function onShown(res) {
            if (hidden) {
                hidden = false;
                game.emit(game.EVENT_SHOW, res);
            }
        }

        // Maybe not support in open data context
        __globalAdapter.onShow && __globalAdapter.onShow(onShown);
        __globalAdapter.onHide && __globalAdapter.onHide(onHidden);

        this.on(game.EVENT_HIDE, function () {
            game.pause();
        });
        this.on(game.EVENT_SHOW, function () {
            game.resume();
        });
    },

    end () { },  // mini game platform not support this api
});
