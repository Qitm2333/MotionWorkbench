(() => {
  let context = null;
  let firstVertex = true;

  window.push = () => context.save();
  window.pop = () => context.restore();
  window.translate = (x, y) => context.translate(x, y);
  window.atan = Math.atan;
  window.tan = Math.tan;
  window.beginShape = () => { context.beginPath(); firstVertex = true; };
  window.vertex = (x, y) => {
    if (firstVertex) context.moveTo(x, y);
    else context.lineTo(x, y);
    firstVertex = false;
  };
  window.bezierVertex = (x1, y1, x2, y2, x3, y3) => context.bezierCurveTo(x1, y1, x2, y2, x3, y3);
  window.quadraticVertex = (x1, y1, x2, y2) => context.quadraticCurveTo(x1, y1, x2, y2);
  window.endShape = () => context.stroke();
  window.line = (x1, y1, x2, y2) => {
    context.beginPath();
    context.moveTo(x1, y1);
    context.lineTo(x2, y2);
    context.stroke();
  };

  window.drawSourceGlyph = (nextContext, char, width, height) => {
    context = nextContext;
    window.typeX = width;
    window.typeY = height;
    window.strecherX = 0;
    window.strecherY = 0;
    window.inpText = char;
    window.letter_select = 0;
    context.save();
    context.translate(-width / 2, -height / 2);
    window.keyboardEngine();
    context.restore();
    context = null;
  };
})();
