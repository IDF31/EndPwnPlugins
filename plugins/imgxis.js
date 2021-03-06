/*
IMGXIS made by YellowAfterlife. http://yellowafterlife.itch.io/imgxis (mirror: https://github.com/Cynosphere/IMGXIS)
Ported by Jane (maybejane/statefram) and Cynthia (BoxOfFlex/Cynosphere) to a private client mod.
Re-ported by Cynthia to EndPwn.
*/
exports.manifest = {
  author: "Cynosphere, YellowAfterlife",
  name: "IMGXIS",
  description: "A better way to view images."
}
exports.start = function(){
    var globalPanner;
    var values = {};

    /*function _hook() {
        const imageWrapper = document.querySelectorAll(
          'div[class^="modal-"] div[class^="inner-"] div div[class^="imageWrapper-"]'
        )[0];
        const image = imageWrapper.children[0].className == "imgxis-panner" ? imageWrapper.children[0].children[0] : imageWrapper.children[0];
        if (imageWrapper && image) {
            onImageOpen(image);
        } else {
            onImageClose(globalPanner);
        }
    }
    window._hook = _hook;*/

    function onLoad() {
        var css = document.createElement("style");
        css.type = "text/css";
        css.id = "css-imgxis";
        var menuButtonWidth = 32; // in pixels
        css.innerHTML = [
            "body {",
            " background-image: none;",
            " overflow: hidden;",
            "}",
            // panner area
            ".imgxis-panner {",
            " position: absolute;",
            " left: 0; width: 100%;",
            " top: 0; height: 100%;",
            "}",
            // cursors
            ".imgxis-panner, .imgxis-panner img {",
            " cursor: move;",
            "}",
            ".imgxis-panner.colorpick, .imgxis-panner.colorpick img {",
            " cursor: default;",
            " cursor: copy;",
            "}",
            // disable interpolation:
            ".imgxis-panner.zoomed, .imgxis-panner.zoomed img {",
            " -ms-interpolation-mode: nearest-neighbor;",
            " image-rendering: optimizeSpeed;",
            " image-rendering: -moz-crisp-edges;",
            " image-rendering: -webkit-optimize-contrast;",
            " image-rendering: -o-crisp-edges;",
            " image-rendering: pixelated;",
            "}",
            // actual image:
            ".imgxis-panner img {",
            // disable Firefox' centering:
            " position: relative;",
            " margin: 0;",
            "}",
            // menu pane on top:
            ".imgxis-menu {",
            " position: absolute;",
            " left: 0; width: 100%;",
            " top: 0; height: 24px;",
            " background: rgba(0, 0, 0, 0.7);",
            " padding: 4px;",
            " color: white;",
            " font: 16px sans-serif;",
            " line-height: 24px;",
            " min-width: 1024px;",
            "}",
            // style the buttons in the menu:
            ".imgxis-menu input {",
            ` width: ${menuButtonWidth}px;`,
            " height: 24px;",
            " padding: 0px;",
            " margin-right: 2px;",
            " float: left;",
            "}"
        ].join("\n");
        document.head.appendChild(css);
    }
    onLoad();

    function onImageOpen(element) {
        let wrap = document.querySelector('div[class*="imageWrapper-"]');
        const openOrig = document.querySelectorAll('div a[class*="downloadLink-"]')[0];
        openOrig.style.display = "none";
        const origLink = openOrig.getAttribute("href");
        var menuColors = 10; // how many color buttons to show in the menu
        // ensure that the page contains nothing but a single <img>:
        var q = element;
        if (q.tagName != "IMG") return;
        // stylesheet:
        // the thing is that browser has it's own zoom in controls, and they are
        // linked to that particular <img> natively. So we need to make a copy of it, strip
        // it of any unneeded styles, and put it in place of the original:
        var o = q.cloneNode();
        //remove size downscaling
        let reg = /\?width=\d+&height=\d+$/;
        let os = o.getAttribute("src");
        let repl = os.replace(reg, "");
        o.setAttribute("src", repl);
        //
        o.removeAttribute("width");
        o.removeAttribute("height");
        var panner = document.createElement("div");
        globalPanner = panner;

        function check() {
          if (!wrap) {
            onImageClose(globalPanner);
          }
        }
        var pannerZoomed = false;
        panner.className = "imgxis-panner";
        panner.style.height = "100vh";
        panner.style.width = "100vw";
        panner.appendChild(o);
        q.parentNode.appendChild(panner);
        //q.parentNode.removeChild(q);
        q.style.display = "none";

        function fixWrap() {
          let elems = document.querySelectorAll(
            'div[class^="modal-"] > div[class^="inner-"] > div > div[class^="imageWrapper-"]'
          );
          elems.forEach(el => {
            fixElem(el);
          });
        }

        function fixElem(elemToFix) {
          if (electron.process.platform == "win32" || electron.process.platform == "darwin") {
            menu.style.zIndex = 3003;
            menu.style.top = $('[class*="typeWindows-"]').clientHeight+"px";
            menu.style.position = "absolute";
            menu.style.left = 0;
            elemToFix.style.top = $('[class*="typeWindows-"]').clientHeight+"px";
            elemToFix.style.height = `calc(100vh - ${$('[class*="typeWindows-"]').clientHeight}px)`;
          } else {
            elemToFix.style.height = "100vh";
            elemToFix.style.top = 0;
          }

          elemToFix.style.width = "100vw";
          elemToFix.style.position = "absolute";
          elemToFix.style.zIndex = 3002;
          elemToFix.style.left = 0;
        }

        var s = o.style;
        s.transformOrigin = "top left";
        q = null;
        var tile = false;
        //
        var w = 0,
          h = 0,
          x = 0,
          y = 0,
          z = 0,
          m = 1;
        // pan and zoom:
        function update() {
          var pz = m > 1;
          if (pz != pannerZoomed) {
            pannerZoomed = pz;
            var cl = panner.classList;
            if (pz) cl.add("zoomed");
            else cl.remove("zoomed");
          }
          if (tile) {
            var p = panner.style;
            p.backgroundPosition = `${-x}px ${-y}px`;
            p.backgroundSize = `${o.width * m}px`;
          }
          s.transform = `matrix(${m},0,0,${m},${-x},${-y})`;
        }

        function zoomto(zx, zy, d) {
          var p = m;
          m = Math.pow(2, (z += d));
          var f = m / p;
          x = (zx + x) * f - zx;
          y = (zy + y) * f - zy;
          menu_zoom.innerHTML = (0 | (m * 100)) + "%";
          update();
        }

        // menu:
        var menu_zoom = null,
          menu;
        (function() {
          menu = document.createElement("div");
          menu.style.zIndex = 2000;
          menu.className = "imgxis-menu";

          function menubt(s, f, style) {
            var bt = document.createElement("input");
            bt.type = "button";
            bt.value = s;
            if (style) {
              bt.style = style;
            }
            bt.addEventListener("click", f);
            menu.appendChild(bt);
          }
          var defcolors = [
            "#6A86B7",
            "#60C19D",
            "#AB7680",
            "#FFFFFF",
            "#F4F2EC",
            "#CAC2BD",
            "#88898E",
            "#4F556A",
            "#1D1F2C",
            "#000000"
          ];

          function menucl(i) {
            var bt = document.createElement("input");
            bt.type = "color";
            bt.style.zIndex = 1001;
            bt.value = GM_getValue(`imgxis-color${i}`, defcolors[i]);

            function bt_apply() {
              let bodyElem = document.querySelector('div[class*="backdrop-"]');
              bodyElem.style.backgroundColor = bt.value;
            }
            bt.addEventListener("click", function(e) {
              if (!e.shiftKey) {
                e.preventDefault();
                bt_apply();
              }
            });
            bt.addEventListener("change", function(e) {
              GM_setValue(`imgxis-color${i}`, bt.value);
              bt_apply();
            });
            bt.title = `Color ${i + 1}.\nClick to apply.\nShift+click to change.`;
            menu.appendChild(bt);
            if (i == 0) bt_apply();
          }
          for (var i = 0; i < menuColors; i++) menucl(i);
          menubt("-", function(_) {
            zoomto(window.innerWidth / 2, window.innerHeight / 2, -0.5);
          });
          menubt("1:1", function(_) {
            var iw = window.innerWidth,
              ih = window.innerHeight;
            zoomto(iw / 2, ih / 2, -z);
            x = (w - iw) / 2;
            y = (h - ih) / 2;
            update();
          });
          menubt("+", function(_) {
            zoomto(window.innerWidth / 2, window.innerHeight / 2, 0.5);
          });
          menubt("tile", function(_) {
            tile = !tile;
            panner.style.backgroundImage = tile ? `url(${o.src})` : "";
            update();
          });
          menubt(
            "original",
            function(_) {
              window.open(origLink);
            },
            "width:50px;"
          );
          //
          menu_zoom = document.createElement("span");
          menu_zoom.innerHTML = "100%";
          menu.appendChild(menu_zoom);
          document
            .querySelector('div[class*="backdrop-"]')
            .parentNode.appendChild(menu);
        })();
        // mouse controls:
        function onmousewheel(e) {
          var d = e.wheelDelta || -e.detail;
          d = (d < 0 ? -1 : d > 0 ? 1 : 0) * 0.5;
          zoomto(e.pageX, e.pageY, d);
          check();
        }
        var mx = 0,
          my = 0,
          mp = false;

        function onmousemove(e) {
          var ox = mx;
          mx = e.pageX;
          var dx = mx - ox;
          var oy = my;
          my = e.pageY;
          var dy = my - oy;
          if (mp) {
            x -= mx - ox;
            y -= my - oy;
            update();
          }
          check();
        }

        function onmousedown(e) {
          onmousemove(e);
          fixWrap();
          if (e.which != 3 && !e.altKey) {
            // not the right click
            e.preventDefault(); // disable image "grab"
            mp = true;
          }
        }

        function onmouseup(e) {
          onmousemove(e);
          fixWrap();
          mp = false;
        }

        //
        var refresh_timer = null;

        function refresh() {
          var o_src = o.src;
          // strip the previous timestamp parameter:
          var pos = o_src.indexOf("imgxis-time");
          if (pos >= 0) {
            switch (o_src.charAt(pos - 1)) {
              case "&":
              case "?":
                pos--;
                break;
            }
            o_src = o_src.substring(0, pos);
          }
          // add a timestamp parameter:
          o_src += o_src.indexOf("?") >= 0 ? "&" : "?";
          o_src += `imgxis-time=${Date.now()}`;
          //
          o.src = o_src;
          if (tile) panner.style.backgroundImage = `url(${o.src})`;
        }

        //
        function onkeydown(e) {
          switch (e.keyCode) {
            case 27:
              onImageClose(globalPanner);
              break;
            case 116:
              e.preventDefault();
              if (e.shiftKey) {
                if (refresh_timer == null) {
                  var t = parseFloat(prompt("Refresh interval (seconds)", "15"));
                  if (!isNaN(t))
                    refresh_timer = setInterval(refresh, Math.max(100, t * 1000));
                } else clearInterval(refresh_timer);
              } else refresh();
              break;
          }
        }
        window.addEventListener("mousemove", onmousemove);
        panner.addEventListener("mousedown", onmousedown);
        window.addEventListener("mouseup", onmouseup);
        window.addEventListener("mousewheel", onmousewheel);
        window.addEventListener("DOMMouseScroll", onmousewheel);
        window.addEventListener("keydown", onkeydown);
        // consider that the image dimensions may not be available instantly:
        var onwait_t = 1000;
        var onwait = function onwait() {
            w = o.width;
            h = o.height;
            if (w > 0 && h > 0) {
                var iw = window.innerWidth,
                lw = w;
                var ih = window.innerHeight,
                lh = h;
                if (lw < iw && lh < ih)
                for (var k = 0; k < 3; k++) {
                    if (lw * 2 < iw && lh * 2 < ih) {
                    z++;
                    lw *= 2;
                    lh *= 2;
                    }
                }
                else
                while (lw > iw || lh > ih) {
                    z--;
                    lw /= 2;
                    lh /= 2;
                }
                m = Math.pow(2, z);
                menu_zoom.innerHTML = (0 | (m * 100)) + "%";
                x = -(iw - lw) / 2;
                y = -(ih - lh) / 2;
                update();
                fixWrap();
            } else if (--onwait_t > 0) setTimeout(onwait, 10);
        };
        onwait();
      }

    function onImageClose(panner) {
        if (panner) {
            document.querySelectorAll('div[class*="imgxis-menu"]').forEach(el=>el.remove());
            window.removeEventListener("mousemove", onmousemove);
            panner.removeEventListener("mousedown", onmousedown);
            window.removeEventListener("mouseup", onmouseup);
            window.removeEventListener("mousewheel", onmousewheel);
            window.removeEventListener("DOMMouseScroll", onmousewheel);
            window.removeEventListener("keydown", onkeydown);
            globalPanner = undefined;
        }
    }

    function GM_getValue(name, defaultV) {
        if (values[name]) {
            return values[name];
        } else {
            return defaultV;
        }
    }

    function GM_setValue(name, value) {
        values[name] = value;
    }

    $api.events.hook("MODAL_PUSH",e=>{
        setTimeout(_=>{
            const imageWrapper = document.querySelectorAll('div[class^="modal-"] div[class^="inner-"] div div[class^="imageWrapper-"]')[0];
            const image = (imageWrapper && imageWrapper.children[0].className == "imgxis-panner") ? imageWrapper.children[0].children[0] : (imageWrapper ? imageWrapper.children[0] : imageWrapper);
            if (imageWrapper && image) {
                onImageOpen(image);
            }
        },300);
    });

    $api.events.hook("MODAL_POP",e=>{
        onImageClose(globalPanner);
    });
}