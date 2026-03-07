(function () {
  function clampPercent(value) {
    var numeric = Number(value);
    if (!Number.isFinite(numeric)) {
      return 50;
    }
    return Math.min(100, Math.max(0, numeric));
  }

  function toPlainValue(value) {
    if (!value) {
      return { x: 50, y: 50 };
    }

    if (typeof value.get === "function") {
      return {
        x: clampPercent(value.get("x")),
        y: clampPercent(value.get("y"))
      };
    }

    return {
      x: clampPercent(value.x),
      y: clampPercent(value.y)
    };
  }

  function normalizePathSegment(segment) {
    if (/^\d+$/.test(segment)) {
      return Number(segment);
    }
    return segment;
  }

  function getEntryValueAtPath(entry, rawPathSegments) {
    if (!entry || typeof entry.getIn !== "function" || !rawPathSegments || !rawPathSegments.length) {
      return "";
    }

    var normalized = rawPathSegments.map(normalizePathSegment);
    return (
      entry.getIn(["data"].concat(normalized)) ||
      entry.getIn(normalized) ||
      ""
    );
  }

  function buildImagePathFromForID(forID) {
    if (!forID || typeof forID !== "string") {
      return null;
    }

    var segments = forID.split(".");
    if (!segments.length) {
      return null;
    }

    var lastIndex = segments.length - 1;
    if (segments[lastIndex] !== "focus") {
      return null;
    }

    segments[lastIndex] = "image";
    return segments;
  }

  function findImageValueFromEntry(entry, forID) {
    if (!entry || typeof entry.getIn !== "function") {
      return "";
    }

    var forIDImagePath = buildImagePathFromForID(forID);
    var fromForID = getEntryValueAtPath(entry, forIDImagePath);
    if (fromForID) {
      return fromForID;
    }

    return getEntryValueAtPath(entry, ["image"]);
  }

  function findImageValueFromDom(forID, rootEl) {
    function readValueFromElement(element) {
      if (!element) {
        return "";
      }

      if (typeof element.value === "string" && element.value.trim()) {
        return element.value.trim();
      }

      if (typeof element.getAttribute === "function") {
        var srcAttr = element.getAttribute("src");
        if (srcAttr && srcAttr.trim()) {
          return srcAttr.trim();
        }
      }

      return "";
    }

    function isLikelyImagePath(value) {
      return /^(https?:|blob:|data:|\/)/i.test(value) || /^Asset\//i.test(value);
    }

    function findByIdOrName(idOrName) {
      if (!idOrName) {
        return "";
      }

      var byId = document.getElementById(idOrName);
      var fromId = readValueFromElement(byId);
      if (fromId) {
        return fromId;
      }

      try {
        var byName = document.querySelector('[name="' + idOrName.replace(/"/g, '\\"') + '"]');
        var fromName = readValueFromElement(byName);
        if (fromName) {
          return fromName;
        }

        var byNameEndsWith = document.querySelector('[name$="' + idOrName.replace(/"/g, '\\"') + '"]');
        var fromNameEndsWith = readValueFromElement(byNameEndsWith);
        if (fromNameEndsWith) {
          return fromNameEndsWith;
        }
      } catch (error) {
        // ignore invalid selector and continue fallback chain
      }

      return "";
    }

    function findNearestImageValue(startEl, forIDValue) {
      var focusEl = document.getElementById(forIDValue);
      var container = startEl || (focusEl ? focusEl.parentElement : null);
      var hops = 0;

      while (container && hops < 6) {
        var candidates = container.querySelectorAll("input, textarea, img");
        for (var i = 0; i < candidates.length; i += 1) {
          var candidate = candidates[i];
          if (focusEl && candidate === focusEl) {
            continue;
          }

          var hint = ((candidate.id || "") + " " + (candidate.name || "") + " " + (candidate.className || "")).toLowerCase();
          if (candidate.tagName !== "IMG" && hint.indexOf("image") === -1 && hint.indexOf("media") === -1) {
            continue;
          }

          var candidateValue = readValueFromElement(candidate);
          if (candidateValue && isLikelyImagePath(candidateValue)) {
            return candidateValue;
          }
        }

        container = container.parentElement;
        hops += 1;
      }

      return "";
    }

    function findImageValueNearWidgetRoot(startEl) {
      if (!startEl) {
        return "";
      }

      var container = startEl;
      var hops = 0;

      while (container && hops < 8) {
        var mediaCandidates = container.querySelectorAll("img[src], input[type='text'], input[type='hidden'], textarea");
        for (var i = 0; i < mediaCandidates.length; i += 1) {
          var candidate = mediaCandidates[i];
          var value = readValueFromElement(candidate);
          if (!value) {
            continue;
          }

          var isMediaLike = /(^https?:|^blob:|^data:image|^\/|^Asset\/|uploads\/)/i.test(value);
          if (isMediaLike) {
            return value;
          }
        }

        container = container.parentElement;
        hops += 1;
      }

      return "";
    }

    function findImageValueByListIndex(forIDValue) {
      if (!forIDValue || typeof forIDValue !== "string") {
        return "";
      }

      var indexMatch = forIDValue.match(/(?:\.|\[)(\d+)(?:\.|\])/);
      if (!indexMatch) {
        return "";
      }

      var indexToken = indexMatch[1];
      var globalCandidates = document.querySelectorAll("input, textarea, img");

      for (var i = 0; i < globalCandidates.length; i += 1) {
        var candidate = globalCandidates[i];
        var candidateHint = ((candidate.id || "") + " " + (candidate.name || "") + " " + (candidate.className || "")).toLowerCase();

        var hasIndex = candidateHint.indexOf(indexToken) !== -1;
        var hasImageKeyword = candidate.tagName === "IMG" || candidateHint.indexOf("image") !== -1 || candidateHint.indexOf("media") !== -1;
        if (!hasIndex || !hasImageKeyword) {
          continue;
        }

        var value = readValueFromElement(candidate);
        if (value && isLikelyImagePath(value)) {
          return value;
        }
      }

      return "";
    }

    function findAnyImageLikeValue() {
      var globalCandidates = document.querySelectorAll("input[type='text'], input[type='hidden'], textarea, img[src]");
      for (var i = 0; i < globalCandidates.length; i += 1) {
        var value = readValueFromElement(globalCandidates[i]);
        if (value && isLikelyImagePath(value)) {
          return value;
        }
      }

      return "";
    }

    if (!forID) {
      return "";
    }

    var imageId = forID.replace(/focus$/, "image");
    var dotPath = imageId.replace(/\[(\d+)\]/g, ".$1");
    var bracketPath = imageId.replace(/\.(\d+)\./g, "[$1].");
    var pathVariants = [
      imageId,
      dotPath,
      bracketPath,
      imageId.replace(/\./g, "__"),
      imageId.replace(/\./g, "_"),
      imageId.replace(/\./g, "-"),
      imageId.replace(/\[(\d+)\]/g, ".$1"),
      imageId.replace(/\.(\d+)\./g, "__$1__")
    ];

    for (var variantIndex = 0; variantIndex < pathVariants.length; variantIndex += 1) {
      var fromVariant = findByIdOrName(pathVariants[variantIndex]);
      if (fromVariant) {
        return fromVariant;
      }
    }

    var nearestImageValue = findNearestImageValue(rootEl, forID);
    if (nearestImageValue) {
      return nearestImageValue;
    }

    var nearbyValue = findImageValueNearWidgetRoot(rootEl);
    if (nearbyValue) {
      return nearbyValue;
    }

    var indexScopedValue = findImageValueByListIndex(forID);
    if (indexScopedValue) {
      return indexScopedValue;
    }

    var anyImageLikeValue = findAnyImageLikeValue();
    if (anyImageLikeValue) {
      return anyImageLikeValue;
    }

    return "";
  }

  function normalizeImageUrl(value) {
    if (typeof value !== "string") {
      return "";
    }

    var trimmed = value.trim();
    if (!trimmed) {
      return "";
    }

    if (/^(https?:|data:|blob:)/i.test(trimmed) || trimmed.charAt(0) === "/") {
      return trimmed;
    }

    return "/" + trimmed.replace(/^\/+/, "");
  }

  function maybeInitCmsAfterWidgetRegister() {
    if (!window.CMS || !window.CMS_MANUAL_INIT || window.__cmsManuallyInitialized) {
      return;
    }

    window.__cmsManuallyInitialized = true;
    window.CMS.init();
  }

  function registerWhenReady() {
    if (!window.CMS) {
      window.setTimeout(registerWhenReady, 120);
      return;
    }

    var createClass = window.createClass;
    var h = window.h;

    if (!createClass || !h) {
      window.setTimeout(registerWhenReady, 120);
      return;
    }

    var presetButtonStyle = {
      border: "1px solid #b7c5ec",
      background: "#ffffff",
      color: "#2f4271",
      borderRadius: "8px",
      padding: "6px 8px",
      cursor: "pointer",
      fontSize: "12px",
      fontWeight: "600"
    };

    var ImageFocusControl = createClass({
      getInitialState: function () {
        var initialValue = toPlainValue(this.props.value);
        var initialImage = normalizeImageUrl(findImageValueFromEntry(this.props.entry, this.props.forID) || findImageValueFromDom(this.props.forID));
        return {
          x: initialValue.x,
          y: initialValue.y,
          dragging: false,
          imageSrc: initialImage
        };
      },

      resolveImageSource: function () {
        return normalizeImageUrl(findImageValueFromEntry(this.props.entry, this.props.forID) || findImageValueFromDom(this.props.forID, this.rootEl));
      },

      syncImageSource: function () {
        var nextImage = this.resolveImageSource();
        if (nextImage !== this.state.imageSrc) {
          this.setState({ imageSrc: nextImage });
        }
      },

      componentDidMount: function () {
        this.pushChange(this.state.x, this.state.y);
        this.syncImageSource();
        window.addEventListener("mousemove", this.handleMouseMove);
        window.addEventListener("mouseup", this.handleMouseUp);
        window.addEventListener("touchmove", this.handleMouseMove, { passive: false });
        window.addEventListener("touchend", this.handleMouseUp);

        // Decap does not always re-render sibling widgets when image field changes.
        this.imageSyncTimer = window.setInterval(this.syncImageSource, 350);
      },

      componentWillUnmount: function () {
        window.removeEventListener("mousemove", this.handleMouseMove);
        window.removeEventListener("mouseup", this.handleMouseUp);
        window.removeEventListener("touchmove", this.handleMouseMove);
        window.removeEventListener("touchend", this.handleMouseUp);

        if (this.imageSyncTimer) {
          window.clearInterval(this.imageSyncTimer);
          this.imageSyncTimer = null;
        }
      },

      componentDidUpdate: function (prevProps) {
        if (prevProps.entry !== this.props.entry || prevProps.forID !== this.props.forID) {
          this.syncImageSource();
        }

        if (prevProps.value !== this.props.value && !this.state.dragging) {
          var nextValue = toPlainValue(this.props.value);
          if (nextValue.x !== this.state.x || nextValue.y !== this.state.y) {
            this.setState({ x: nextValue.x, y: nextValue.y });
          }
        }
      },

      pushChange: function (x, y) {
        this.props.onChange({ x: clampPercent(x), y: clampPercent(y) });
      },

      setFocusFromPoint: function (clientX, clientY) {
        if (!this.previewEl) {
          return;
        }

        var rect = this.previewEl.getBoundingClientRect();
        if (!rect.width || !rect.height) {
          return;
        }

        var xPercent = ((clientX - rect.left) / rect.width) * 100;
        var yPercent = ((clientY - rect.top) / rect.height) * 100;

        xPercent = clampPercent(xPercent);
        yPercent = clampPercent(yPercent);

        this.setState({ x: xPercent, y: yPercent });
        this.pushChange(xPercent, yPercent);
      },

      setFocusFromEvent: function (event) {
        var point = event.touches && event.touches[0] ? event.touches[0] : event;
        this.setFocusFromPoint(point.clientX, point.clientY);
      },

      handleMouseDown: function (event) {
        event.preventDefault();
        this.setState({ dragging: true });
        this.setFocusFromEvent(event);
      },

      handleMouseMove: function (event) {
        if (!this.state.dragging) {
          return;
        }
        event.preventDefault();
        this.setFocusFromEvent(event);
      },

      handleMouseUp: function () {
        if (this.state.dragging) {
          this.setState({ dragging: false });
        }
      },

      handleRangeChange: function (axis, event) {
        var value = clampPercent(event.target.value);
        var nextState = { x: this.state.x, y: this.state.y };
        nextState[axis] = value;
        this.setState(nextState);
        this.pushChange(nextState.x, nextState.y);
      },

      applyPreset: function (x, y) {
        var nextX = clampPercent(x);
        var nextY = clampPercent(y);
        this.setState({ x: nextX, y: nextY });
        this.pushChange(nextX, nextY);
      },

      renderPresetButton: function (label, x, y, key) {
        return h(
          "button",
          {
            key: key,
            type: "button",
            style: presetButtonStyle,
            onClick: this.applyPreset.bind(this, x, y)
          },
          label
        );
      },

      render: function () {
        var image = this.state.imageSrc || this.resolveImageSource();
        var hasImage = Boolean(image);
        var x = this.state.x;
        var y = this.state.y;

        var previewChildren = [];

        if (!hasImage) {
          previewChildren.push(
            h(
              "div",
              {
                key: "empty",
                style: {
                  position: "absolute",
                  inset: "0",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  textAlign: "left",
                  color: "#4b5f8f",
                  fontSize: "13px",
                  padding: "10px"
                }
              },
              h(
                "div",
                {
                  style: {
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "8px",
                    background: "rgba(255,255,255,0.55)",
                    border: "1px solid #c5d1f0",
                    borderRadius: "999px",
                    padding: "6px 10px"
                  }
                },
                [
                  h("span", {
                    key: "dot",
                    style: {
                      width: "8px",
                      height: "8px",
                      borderRadius: "50%",
                      background: "#4c6bdd",
                      display: "inline-block"
                    }
                  }),
                  h("span", { key: "text" }, "Tambahkan gambar di field Gambar di atas")
                ]
              )
            )
          );
        }

        if (hasImage) {
          previewChildren.push(
            h("div", {
              key: "point",
              style: {
                position: "absolute",
                left: x + "%",
                top: y + "%",
                width: "12px",
                height: "12px",
                borderRadius: "50%",
                background: "rgba(255,255,255,0.95)",
                border: "2px solid #3f5fcf",
                boxShadow: "0 2px 8px rgba(0,0,0,0.28)",
                transform: "translate(-50%, -50%)"
              }
            })
          );
        }

        return h(
          "div",
          {
            className: this.props.classNameWrapper,
            ref: function (el) {
              this.rootEl = el;
            }.bind(this),
            style: {
              border: "1px solid #d0d7eb",
              borderRadius: "10px",
              padding: "12px",
              background: "#f8faff"
            }
          },
          h(
            "div",
            {
              ref: function (el) {
                this.previewEl = el;
              }.bind(this),
              onMouseDown: this.handleMouseDown,
              onTouchStart: this.handleMouseDown,
              style: {
                width: "100%",
                maxWidth: "420px",
                aspectRatio: "4 / 3",
                borderRadius: "10px",
                overflow: "hidden",
                position: "relative",
                border: "1px solid #b9c8f0",
                cursor: hasImage ? "grab" : "not-allowed",
                backgroundColor: "#dde6ff",
                backgroundImage: hasImage ? "url('" + image.replace(/'/g, "\\'") + "')" : "none",
                backgroundSize: "cover",
                backgroundPosition: x + "% " + y + "%"
              }
            },
            previewChildren
          ),
          h(
            "div",
            { style: { marginTop: "12px", display: "grid", gap: "10px", maxWidth: "420px" } },
            h(
              "label",
              { style: { display: "grid", gap: "4px", fontSize: "13px", color: "#2f4271" } },
              "Horizontal (X): " + Math.round(x) + "%",
              h("input", {
                type: "range",
                min: "0",
                max: "100",
                step: "1",
                value: x,
                onChange: this.handleRangeChange.bind(this, "x")
              })
            ),
            h(
              "label",
              { style: { display: "grid", gap: "4px", fontSize: "13px", color: "#2f4271" } },
              "Vertikal (Y): " + Math.round(y) + "%",
              h("input", {
                type: "range",
                min: "0",
                max: "100",
                step: "1",
                value: y,
                onChange: this.handleRangeChange.bind(this, "y")
              })
            ),
            h(
              "div",
              {
                style: {
                  display: "grid",
                  gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
                  gap: "6px"
                }
              },
              [
                this.renderPresetButton("Top Left", 0, 0, "tl"),
                this.renderPresetButton("Top", 50, 0, "t"),
                this.renderPresetButton("Top Right", 100, 0, "tr"),
                this.renderPresetButton("Left", 0, 50, "l"),
                this.renderPresetButton("Center", 50, 50, "c"),
                this.renderPresetButton("Right", 100, 50, "r"),
                this.renderPresetButton("Bottom Left", 0, 100, "bl"),
                this.renderPresetButton("Bottom", 50, 100, "b"),
                this.renderPresetButton("Bottom Right", 100, 100, "br")
              ]
            )
          )
        );
      }
    });

    window.CMS.registerWidget("imageFocus", ImageFocusControl);
    maybeInitCmsAfterWidgetRegister();
  }

  registerWhenReady();
})();
