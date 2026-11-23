// Runs on the outer Simples Nacional page. Keyboard focus stays out here by
// default, so the user's Enter never reaches the Consultar button inside the
// frame. Moving focus into the frame lets that real key press hit the button.
function focusFrame() {
  const frame = document.querySelector("iframe[src*='ConsultaOptantes'], iframe#frame");
  if (frame && document.activeElement !== frame) frame.focus();
}

window.addEventListener('message', (event) => {
  if (event.data === 'csn-focus') focusFrame();
});
focusFrame();
