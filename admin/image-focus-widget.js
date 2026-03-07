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

  function findImageValueFromEntry(entry) {
    if (!entry || typeof entry.getIn !== "function") {
      return "";
    }

    return entry.getIn(["data", "image"]) || entry.getIn(["image"]) || "";
  }

  function findImageValueFromDom(forID) {
    if (!forID) {
      return "";
    }

    var imageId = forID.replace(/focus$/, "image");
    var imageInput = document.getElementById(imageId);

    if (imageInput && imageInput.value) {
      return imageInput.value;
    }

    return "";
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
        return {
          x: initialValue.x,
          y: initialValue.y,
          dragging: false
        };
      },

      componentDidMount: function () {
        this.pushChange(this.state.x, this.state.y);
        window.addEventListener("mousemove", this.handleMouseMove);
        window.addEventListener("mouseup", this.handleMouseUp);
        window.addEventListener("touchmove", this.handleMouseMove, { passive: false });
        window.addEventListener("touchend", this.handleMouseUp);
      },

      componentWillUnmount: function () {
        window.removeEventListener("mousemove", this.handleMouseMove);
        window.removeEventListener("mouseup", this.handleMouseUp);
        window.removeEventListener("touchmove", this.handleMouseMove);
        window.removeEventListener("touchend", this.handleMouseUp);
      },

      componentDidUpdate: function (prevProps) {
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
        var image = findImageValueFromEntry(this.props.entry) || findImageValueFromDom(this.props.forID);
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
                  textAlign: "center",
                  color: "#4b5f8f",
                  fontSize: "13px",
                  padding: "10px"
                }
              },
              "Pilih gambar dulu, lalu geser titik fokus di sini."
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
                width: "18px",
                height: "18px",
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
