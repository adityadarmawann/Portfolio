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

    return (
      entry.getIn(["data", "image"]) ||
      entry.getIn(["image"]) ||
      ""
    );
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

  function registerWhenReady() {
    if (!window.CMS || !window.React) {
      window.setTimeout(registerWhenReady, 120);
      return;
    }

    var React = window.React;

    class ImageFocusControl extends React.Component {
      constructor(props) {
        super(props);
        var initialValue = toPlainValue(props.value);
        this.state = {
          x: initialValue.x,
          y: initialValue.y,
          dragging: false
        };

        this.previewRef = React.createRef();
        this.handleMouseMove = this.handleMouseMove.bind(this);
        this.handleMouseUp = this.handleMouseUp.bind(this);
      }

      componentDidMount() {
        this.pushChange(this.state.x, this.state.y);
        window.addEventListener("mousemove", this.handleMouseMove);
        window.addEventListener("mouseup", this.handleMouseUp);
        window.addEventListener("touchmove", this.handleMouseMove, { passive: false });
        window.addEventListener("touchend", this.handleMouseUp);
      }

      componentWillUnmount() {
        window.removeEventListener("mousemove", this.handleMouseMove);
        window.removeEventListener("mouseup", this.handleMouseUp);
        window.removeEventListener("touchmove", this.handleMouseMove);
        window.removeEventListener("touchend", this.handleMouseUp);
      }

      componentDidUpdate(prevProps) {
        if (prevProps.value !== this.props.value && !this.state.dragging) {
          var nextValue = toPlainValue(this.props.value);
          if (nextValue.x !== this.state.x || nextValue.y !== this.state.y) {
            this.setState({ x: nextValue.x, y: nextValue.y });
          }
        }
      }

      pushChange(x, y) {
        this.props.onChange({ x: clampPercent(x), y: clampPercent(y) });
      }

      setFocusFromPoint(clientX, clientY) {
        if (!this.previewRef.current) {
          return;
        }

        var rect = this.previewRef.current.getBoundingClientRect();
        if (!rect.width || !rect.height) {
          return;
        }

        var xPercent = ((clientX - rect.left) / rect.width) * 100;
        var yPercent = ((clientY - rect.top) / rect.height) * 100;

        xPercent = clampPercent(xPercent);
        yPercent = clampPercent(yPercent);

        this.setState({ x: xPercent, y: yPercent });
        this.pushChange(xPercent, yPercent);
      }

      handleMouseDown(event) {
        event.preventDefault();
        this.setState({ dragging: true });
        this.setFocusFromEvent(event);
      }

      handleMouseMove(event) {
        if (!this.state.dragging) {
          return;
        }
        event.preventDefault();
        this.setFocusFromEvent(event);
      }

      handleMouseUp() {
        if (this.state.dragging) {
          this.setState({ dragging: false });
        }
      }

      setFocusFromEvent(event) {
        var point = event.touches && event.touches[0] ? event.touches[0] : event;
        this.setFocusFromPoint(point.clientX, point.clientY);
      }

      handleRangeChange(axis, event) {
        var value = clampPercent(event.target.value);
        var nextState = { x: this.state.x, y: this.state.y };
        nextState[axis] = value;
        this.setState(nextState);
        this.pushChange(nextState.x, nextState.y);
      }

      applyPreset(x, y) {
        var nextX = clampPercent(x);
        var nextY = clampPercent(y);
        this.setState({ x: nextX, y: nextY });
        this.pushChange(nextX, nextY);
      }

      render() {
        var image = findImageValueFromEntry(this.props.entry) || findImageValueFromDom(this.props.forID);
        var hasImage = Boolean(image);
        var x = this.state.x;
        var y = this.state.y;

        return React.createElement(
          "div",
          {
            style: {
              border: "1px solid #d0d7eb",
              borderRadius: "10px",
              padding: "12px",
              background: "#f8faff"
            }
          },
          React.createElement(
            "div",
            {
              ref: this.previewRef,
              onMouseDown: this.handleMouseDown.bind(this),
              onTouchStart: this.handleMouseDown.bind(this),
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
            !hasImage
              ? React.createElement(
                  "div",
                  {
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
              : null,
            hasImage
              ? React.createElement("div", {
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
              : null
          ),
          React.createElement(
            "div",
            { style: { marginTop: "12px", display: "grid", gap: "10px", maxWidth: "420px" } },
            React.createElement(
              "label",
              { style: { display: "grid", gap: "4px", fontSize: "13px", color: "#2f4271" } },
              "Horizontal (X): " + Math.round(x) + "%",
              React.createElement("input", {
                type: "range",
                min: "0",
                max: "100",
                step: "1",
                value: x,
                onChange: this.handleRangeChange.bind(this, "x")
              })
            ),
            React.createElement(
              "label",
              { style: { display: "grid", gap: "4px", fontSize: "13px", color: "#2f4271" } },
              "Vertikal (Y): " + Math.round(y) + "%",
              React.createElement("input", {
                type: "range",
                min: "0",
                max: "100",
                step: "1",
                value: y,
                onChange: this.handleRangeChange.bind(this, "y")
              })
            ),
            React.createElement(
              "div",
              {
                style: {
                  display: "grid",
                  gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
                  gap: "6px"
                }
              },
              React.createElement(
                "button",
                { type: "button", onClick: this.applyPreset.bind(this, 0, 0), style: presetButtonStyle },
                "Top Left"
              ),
              React.createElement(
                "button",
                { type: "button", onClick: this.applyPreset.bind(this, 50, 0), style: presetButtonStyle },
                "Top"
              ),
              React.createElement(
                "button",
                { type: "button", onClick: this.applyPreset.bind(this, 100, 0), style: presetButtonStyle },
                "Top Right"
              ),
              React.createElement(
                "button",
                { type: "button", onClick: this.applyPreset.bind(this, 0, 50), style: presetButtonStyle },
                "Left"
              ),
              React.createElement(
                "button",
                { type: "button", onClick: this.applyPreset.bind(this, 50, 50), style: presetButtonStyle },
                "Center"
              ),
              React.createElement(
                "button",
                { type: "button", onClick: this.applyPreset.bind(this, 100, 50), style: presetButtonStyle },
                "Right"
              ),
              React.createElement(
                "button",
                { type: "button", onClick: this.applyPreset.bind(this, 0, 100), style: presetButtonStyle },
                "Bottom Left"
              ),
              React.createElement(
                "button",
                { type: "button", onClick: this.applyPreset.bind(this, 50, 100), style: presetButtonStyle },
                "Bottom"
              ),
              React.createElement(
                "button",
                { type: "button", onClick: this.applyPreset.bind(this, 100, 100), style: presetButtonStyle },
                "Bottom Right"
              )
            )
          )
        );
      }
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

    window.CMS.registerWidget("imageFocus", ImageFocusControl);
  }

  registerWhenReady();
})();
