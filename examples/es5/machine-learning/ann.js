"use strict";
"use strict";
var _ = require("lodash");
var Bluebird = require("bluebird");
var async = Bluebird.coroutine;
var debug = require("debug")("af:ann");
function ANN(af, layers, range) {
  range = range || 0.05;
  this.af = af;
  this.numLayers = layers.length;
  this.signal = [];
  this.weights = [];
  for (var i = 0; i < this.numLayers; i++) {
    this.signal.push(new af.AFArray());
    if (i < this.numLayers - 1) {
      var w = af.randu(layers[i] + 1, layers[i + 1], af.dType.f32).mul(range).sub(range / 2);
      this.weights.push(w);
    }
  }
}
var proto = ANN.prototype;
proto.sigmoid = function(val) {
  return this.af.exp(val.neg()).add(1).rhsDiv(1);
};
proto.deriv = function(out) {
  return out.rhsSub(1).mul(out);
};
proto.addBias = function(input) {
  return this.af.join(1, this.af.constant(1, input.dims(0), this.af.dType.f32), input);
};
proto._calculateError = async($traceurRuntime.initGeneratorFunction(function $__2(out, pred) {
  var dif,
      $__3,
      $__4,
      $__5,
      $__6,
      $__7,
      $__8,
      $__9,
      $__10;
  return $traceurRuntime.createGeneratorInstance(function($ctx) {
    while (true)
      switch ($ctx.state) {
        case 0:
          dif = out.sub(pred);
          $ctx.state = 12;
          break;
        case 12:
          $__3 = Math.sqrt;
          $__4 = this.af;
          $__5 = $__4.sumAsync;
          $__6 = dif.mul;
          $__7 = $__6.call(dif, dif);
          $__8 = $__5.call($__4, $__7);
          $ctx.state = 6;
          break;
        case 6:
          $ctx.state = 2;
          return $__8;
        case 2:
          $__9 = $ctx.sent;
          $ctx.state = 4;
          break;
        case 4:
          $__10 = $__3.call(Math, $__9);
          $ctx.state = 8;
          break;
        case 8:
          $ctx.returnValue = $__10;
          $ctx.state = -2;
          break;
        default:
          return $ctx.end();
      }
  }, $__2, this);
}));
proto.forwardPropagate = function(input) {
  this.signal[0].set(input);
  for (var i = 0; i < this.numLayers - 1; i++) {
    var inVec = this.addBias(this.signal[i]);
    var outVec = this.af.matMul(inVec, this.weights[i]);
    this.signal[i + 1].set(this.sigmoid(outVec));
  }
};
proto.backPropagate = function(target, alpha) {
  var af = this.af;
  var Seq = this.af.Seq;
  var outVec = this.signal[this.numLayers - 1];
  var err = outVec.sub(target);
  var m = target.dims(0);
  for (var i = this.numLayers - 2; i >= 0; i--) {
    var inVec = this.addBias(this.signal[i]);
    var delta = af.transpose(this.deriv(outVec).mul(err));
    var grad = af.matMul(delta, inVec).mul(alpha).neg().div(m);
    this.weights[i].addAssign(af.transpose(grad));
    outVec = this.signal[i];
    err.set(af.transpose(this.af.matMul(this.weights[i], delta)));
    err.set(err.at(af.span, new Seq(1, outVec.dims(1))));
  }
};
proto.predict = function(input) {
  this.forwardPropagate(input);
  return this.signal[this.numLayers - 1].copy();
};
proto.train = async($traceurRuntime.initGeneratorFunction(function $__11(input, target, options) {
  var af,
      Seq,
      numSamples,
      numBatches,
      err,
      i,
      j,
      startPos$__0,
      endPos$__1,
      x,
      y,
      startPos,
      endPos,
      outVec;
  return $traceurRuntime.createGeneratorInstance(function($ctx) {
    while (true)
      switch ($ctx.state) {
        case 0:
          af = this.af;
          Seq = this.af.Seq;
          numSamples = input.dims(0);
          numBatches = numSamples / options.batchSize;
          err = 0;
          $ctx.state = 20;
          break;
        case 20:
          i = 0;
          $ctx.state = 16;
          break;
        case 16:
          $ctx.state = (i < options.maxEpochs) ? 10 : 14;
          break;
        case 13:
          i++;
          $ctx.state = 16;
          break;
        case 10:
          for (j = 0; j < numBatches - 1; j++) {
            startPos$__0 = j * options.batchSize;
            endPos$__1 = startPos$__0 + options.batchSize;
            x = input.at(new Seq(startPos$__0, endPos$__1), af.span);
            y = target.at(new Seq(startPos$__0, endPos$__1), af.span);
            this.forwardPropagate(x);
            this.backPropagate(y, options.alpha);
          }
          startPos = (numBatches - 1) * options.batchSize;
          endPos = numSamples - 1;
          outVec = this.predict(input.at(new Seq(startPos, endPos), af.span));
          $ctx.state = 11;
          break;
        case 11:
          $ctx.state = 2;
          return this._calculateError(outVec, target.at(new Seq(startPos, endPos), af.span));
        case 2:
          err = $ctx.sent;
          $ctx.state = 4;
          break;
        case 4:
          $ctx.state = (err < options.maxError) ? 7 : 6;
          break;
        case 7:
          console.log(("Converged on Epoc: " + (i + 1)));
          $ctx.state = 14;
          break;
        case 6:
          console.log(("Epoch: " + (i + 1) + ", Error: " + err.toFixed(4)));
          $ctx.state = 13;
          break;
        case 14:
          $ctx.returnValue = err;
          $ctx.state = -2;
          break;
        default:
          return $ctx.end();
      }
  }, $__11, this);
}));
module.exports = ANN;
//# sourceMappingURL=data:application/json;base64,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LEVBQUksVUFBVSxNQUFLLENBQUcsQ0FBQSxLQUFJLENBQUc7QUFDM0MsQUFBSSxJQUFBLENBQUEsRUFBQyxFQUFJLENBQUEsSUFBRyxHQUFHLENBQUM7QUFDaEIsQUFBSSxJQUFBLENBQUEsR0FBRSxFQUFJLENBQUEsSUFBRyxHQUFHLElBQUksQ0FBQztBQUdyQixBQUFJLElBQUEsQ0FBQSxNQUFLLEVBQUksQ0FBQSxJQUFHLE9BQU8sQ0FBRSxJQUFHLFVBQVUsRUFBSSxFQUFBLENBQUMsQ0FBQztBQUM1QyxBQUFJLElBQUEsQ0FBQSxHQUFFLEVBQUksQ0FBQSxNQUFLLElBQUksQUFBQyxDQUFDLE1BQUssQ0FBQyxDQUFDO0FBQzVCLEFBQUksSUFBQSxDQUFBLENBQUEsRUFBSSxDQUFBLE1BQUssS0FBSyxBQUFDLENBQUMsQ0FBQSxDQUFDLENBQUM7QUFFdEIsYUFBYSxDQUFBLElBQUcsVUFBVSxFQUFJLEVBQUEsQ0FBRyxDQUFBLENBQUEsR0FBSyxFQUFBLENBQUcsQ0FBQSxDQUFBLEVBQUUsQ0FBRztBQUMxQyxBQUFJLE1BQUEsQ0FBQSxLQUFJLEVBQUksQ0FBQSxJQUFHLFFBQVEsQUFBQyxDQUFDLElBQUcsT0FBTyxDQUFFLENBQUEsQ0FBQyxDQUFDLENBQUM7QUFDeEMsQUFBSSxNQUFBLENBQUEsS0FBSSxFQUFJLENBQUEsRUFBQyxVQUFVLEFBQUMsQ0FBQyxJQUFHLE1BQU0sQUFBQyxDQUFDLE1BQUssQ0FBQyxJQUFJLEFBQUMsQ0FBQyxHQUFFLENBQUMsQ0FBQyxDQUFDO0FBR3JELEFBQUksTUFBQSxDQUFBLElBQUcsRUFBSSxDQUFBLEVBQUMsT0FBTyxBQUFDLENBQUMsS0FBSSxDQUFHLE1BQUksQ0FBQyxJQUFJLEFBQUMsQ0FBQyxLQUFJLENBQUMsSUFBSSxBQUFDLEVBQUMsSUFBSSxBQUFDLENBQUMsQ0FBQSxDQUFDLENBQUM7QUFDMUQsT0FBRyxRQUFRLENBQUUsQ0FBQSxDQUFDLFVBQVUsQUFBQyxDQUFDLEVBQUMsVUFBVSxBQUFDLENBQUMsSUFBRyxDQUFDLENBQUMsQ0FBQztBQUc3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SSxDQUFBLENBOEdELEdBQUUsRUFBSSxDQUFBLE9BQU0sU0FBUyxDQTlHRixRQUF3QyxDQUFDO0FBQ2hFLGVBQUk7O0FBOEdBLGdCQUFNLElBQUksQUFBQyxFQUFDLHFCQUFxQixJQUFDLENBQUEsRUFBSSxFQUFBLEdBQUcsQ0FBQzs7OztBQUk5QyxnQkFBTSxJQUFJLEFBQUMsRUFBQyxTQUFTLElBQUMsQ0FBQSxFQUFJLEVBQUEsR0FBQyxZQUFXLEVBQUMsQ0FBQSxHQUFFLFFBQVEsQUFBQyxDQUFDLENBQUEsQ0FBQyxFQUFHLENBQUM7Ozs7QUFuSGhFLGFBQUcsWUFBWSxFQXNISixJQUFFLEFBdEhzQixDQUFBOzs7O0FBQW5DLGVBQU8sQ0FBQSxJQUFHLElBQUksQUFBQyxFQUFDLENBQUE7O0FBQ21CLEVBQy9CLFFBQTZCLEtBQUcsQ0FBQyxDQUFDO0FBcUh0QyxDQXZIdUQsQ0F1SHRELENBQUM7QUFFRixLQUFLLFFBQVEsRUFBSSxJQUFFLENBQUM7QUFBQSIsImZpbGUiOiJtYWNoaW5lLWxlYXJuaW5nL2Fubi5qcyIsInNvdXJjZVJvb3QiOiJleGFtcGxlcy9lczYiLCJzb3VyY2VzQ29udGVudCI6WyJcInVzZSBzdHJpY3RcIjtcblxubGV0IF8gPSByZXF1aXJlKFwibG9kYXNoXCIpO1xubGV0IEJsdWViaXJkID0gcmVxdWlyZShcImJsdWViaXJkXCIpO1xubGV0IGFzeW5jID0gQmx1ZWJpcmQuY29yb3V0aW5lO1xubGV0IGRlYnVnID0gcmVxdWlyZShcImRlYnVnXCIpKFwiYWY6YW5uXCIpO1xuXG5mdW5jdGlvbiBBTk4oYWYsIGxheWVycywgcmFuZ2UpIHtcbiAgICByYW5nZSA9IHJhbmdlIHx8IDAuMDU7XG4gICAgdGhpcy5hZiA9IGFmO1xuICAgIHRoaXMubnVtTGF5ZXJzID0gbGF5ZXJzLmxlbmd0aDtcbiAgICB0aGlzLnNpZ25hbCA9IFtdO1xuICAgIHRoaXMud2VpZ2h0cyA9IFtdO1xuICAgIGZvciAobGV0IGkgPSAwOyBpIDwgdGhpcy5udW1MYXllcnM7IGkrKykge1xuICAgICAgICB0aGlzLnNpZ25hbC5wdXNoKG5ldyBhZi5BRkFycmF5KCkpO1xuICAgICAgICBpZiAoaSA8IHRoaXMubnVtTGF5ZXJzIC0gMSkge1xuICAgICAgICAgICAgbGV0IHcgPSBhZi5yYW5kdShsYXllcnNbaV0gKyAxLCBsYXllcnNbaSArIDFdLCBhZi5kVHlwZS5mMzIpLm11bChyYW5nZSkuc3ViKHJhbmdlIC8gMik7XG4gICAgICAgICAgICB0aGlzLndlaWdodHMucHVzaCh3KTtcbiAgICAgICAgfVxuICAgIH1cbn1cblxubGV0IHByb3RvID0gQU5OLnByb3RvdHlwZTtcblxucHJvdG8uc2lnbW9pZCA9IGZ1bmN0aW9uICh2YWwpIHtcbiAgICAvLyAxIC8gKDEgKyBleHAoLXZhbCkpO1xuICAgIHJldHVybiB0aGlzLmFmLmV4cCh2YWwubmVnKCkpLmFkZCgxKS5yaHNEaXYoMSk7XG59O1xuXG5wcm90by5kZXJpdiA9IGZ1bmN0aW9uIChvdXQpIHtcbiAgICByZXR1cm4gb3V0LnJoc1N1YigxKS5tdWwob3V0KTtcbn07XG5cbnByb3RvLmFkZEJpYXMgPSBmdW5jdGlvbiAoaW5wdXQpIHtcbiAgICByZXR1cm4gdGhpcy5hZi5qb2luKDEsIHRoaXMuYWYuY29uc3RhbnQoMSwgaW5wdXQuZGltcygwKSwgdGhpcy5hZi5kVHlwZS5mMzIpLCBpbnB1dCk7XG59O1xuXG5wcm90by5fY2FsY3VsYXRlRXJyb3IgPSBhc3luYyhmdW5jdGlvbioob3V0LCBwcmVkKSB7XG4gICAgbGV0IGRpZiA9IG91dC5zdWIocHJlZCk7XG4gICAgcmV0dXJuIE1hdGguc3FydCh5aWVsZCB0aGlzLmFmLnN1bUFzeW5jKGRpZi5tdWwoZGlmKSkpO1xufSk7XG5cbnByb3RvLmZvcndhcmRQcm9wYWdhdGUgPSBmdW5jdGlvbiAoaW5wdXQpIHtcbiAgICB0aGlzLnNpZ25hbFswXS5zZXQoaW5wdXQpO1xuICAgIGZvciAobGV0IGkgPSAwOyBpIDwgdGhpcy5udW1MYXllcnMgLSAxOyBpKyspIHtcbiAgICAgICAgbGV0IGluVmVjID0gdGhpcy5hZGRCaWFzKHRoaXMuc2lnbmFsW2ldKTtcbiAgICAgICAgbGV0IG91dFZlYyA9IHRoaXMuYWYubWF0TXVsKGluVmVjLCB0aGlzLndlaWdodHNbaV0pO1xuICAgICAgICB0aGlzLnNpZ25hbFtpICsgMV0uc2V0KHRoaXMuc2lnbW9pZChvdXRWZWMpKTtcbiAgICB9XG59O1xuXG5wcm90by5iYWNrUHJvcGFnYXRlID0gZnVuY3Rpb24gKHRhcmdldCwgYWxwaGEpIHtcbiAgICBsZXQgYWYgPSB0aGlzLmFmO1xuICAgIGxldCBTZXEgPSB0aGlzLmFmLlNlcTtcblxuICAgIC8vIEdldCBlcnJvciBmb3Igb3V0cHV0IGxheWVyXG4gICAgbGV0IG91dFZlYyA9IHRoaXMuc2lnbmFsW3RoaXMubnVtTGF5ZXJzIC0gMV07XG4gICAgbGV0IGVyciA9IG91dFZlYy5zdWIodGFyZ2V0KTtcbiAgICBsZXQgbSA9IHRhcmdldC5kaW1zKDApO1xuXG4gICAgZm9yIChsZXQgaSA9IHRoaXMubnVtTGF5ZXJzIC0gMjsgaSA+PSAwOyBpLS0pIHtcbiAgICAgICAgbGV0IGluVmVjID0gdGhpcy5hZGRCaWFzKHRoaXMuc2lnbmFsW2ldKTtcbiAgICAgICAgbGV0IGRlbHRhID0gYWYudHJhbnNwb3NlKHRoaXMuZGVyaXYob3V0VmVjKS5tdWwoZXJyKSk7XG5cbiAgICAgICAgLy8gQWRqdXN0IHdlaWdodHNcbiAgICAgICAgbGV0IGdyYWQgPSBhZi5tYXRNdWwoZGVsdGEsIGluVmVjKS5tdWwoYWxwaGEpLm5lZygpLmRpdihtKTtcbiAgICAgICAgdGhpcy53ZWlnaHRzW2ldLmFkZEFzc2lnbihhZi50cmFuc3Bvc2UoZ3JhZCkpO1xuXG4gICAgICAgIC8vIElucHV0IHRvIGN1cnJlbnQgbGF5ZXIgaXMgb3V0cHV0IG9mIHByZXZpb3VzXG4gICAgICAgIG91dFZlYyA9IHRoaXMuc2lnbmFsW2ldO1xuICAgICAgICBlcnIuc2V0KGFmLnRyYW5zcG9zZSh0aGlzLmFmLm1hdE11bCh0aGlzLndlaWdodHNbaV0sIGRlbHRhKSkpO1xuXG4gICAgICAgIC8vIFJlbW92ZSB0aGUgZXJyb3Igb2YgYmlhcyBhbmQgcHJvcGFnYXRlIGJhY2t3YXJkXG4gICAgICAgIGVyci5zZXQoZXJyLmF0KGFmLnNwYW4sIG5ldyBTZXEoMSwgb3V0VmVjLmRpbXMoMSkpKSk7XG4gICAgfVxufTtcblxucHJvdG8ucHJlZGljdCA9IGZ1bmN0aW9uIChpbnB1dCkge1xuICAgIHRoaXMuZm9yd2FyZFByb3BhZ2F0ZShpbnB1dCk7XG4gICAgcmV0dXJuIHRoaXMuc2lnbmFsW3RoaXMubnVtTGF5ZXJzIC0gMV0uY29weSgpO1xufTtcblxucHJvdG8udHJhaW4gPSBhc3luYyhmdW5jdGlvbiooaW5wdXQsIHRhcmdldCwgb3B0aW9ucykge1xuICAgIGxldCBhZiA9IHRoaXMuYWY7XG4gICAgbGV0IFNlcSA9IHRoaXMuYWYuU2VxO1xuXG4gICAgbGV0IG51bVNhbXBsZXMgPSBpbnB1dC5kaW1zKDApO1xuICAgIGxldCBudW1CYXRjaGVzID0gbnVtU2FtcGxlcyAvIG9wdGlvbnMuYmF0Y2hTaXplO1xuXG4gICAgbGV0IGVyciA9IDA7XG5cbiAgICBmb3IgKGxldCBpID0gMDsgaSA8IG9wdGlvbnMubWF4RXBvY2hzOyBpKyspIHtcbiAgICAgICAgZm9yIChsZXQgaiA9IDA7IGogPCBudW1CYXRjaGVzIC0gMTsgaisrKSB7XG4gICAgICAgICAgICBsZXQgc3RhcnRQb3MgPSBqICogb3B0aW9ucy5iYXRjaFNpemU7XG4gICAgICAgICAgICBsZXQgZW5kUG9zID0gc3RhcnRQb3MgKyBvcHRpb25zLmJhdGNoU2l6ZTtcblxuICAgICAgICAgICAgbGV0IHggPSBpbnB1dC5hdChuZXcgU2VxKHN0YXJ0UG9zLCBlbmRQb3MpLCBhZi5zcGFuKTtcbiAgICAgICAgICAgIGxldCB5ID0gdGFyZ2V0LmF0KG5ldyBTZXEoc3RhcnRQb3MsIGVuZFBvcyksIGFmLnNwYW4pO1xuXG4gICAgICAgICAgICB0aGlzLmZvcndhcmRQcm9wYWdhdGUoeCk7XG4gICAgICAgICAgICB0aGlzLmJhY2tQcm9wYWdhdGUoeSwgb3B0aW9ucy5hbHBoYSk7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBWYWxpZGF0ZSB3aXRoIGxhc3QgYmF0Y2hcbiAgICAgICAgbGV0IHN0YXJ0UG9zID0gKG51bUJhdGNoZXMgLSAxKSAqIG9wdGlvbnMuYmF0Y2hTaXplO1xuICAgICAgICBsZXQgZW5kUG9zID0gbnVtU2FtcGxlcyAtIDE7XG4gICAgICAgIGxldCBvdXRWZWMgPSB0aGlzLnByZWRpY3QoaW5wdXQuYXQobmV3IFNlcShzdGFydFBvcywgZW5kUG9zKSwgYWYuc3BhbikpO1xuICAgICAgICBlcnIgPSB5aWVsZCB0aGlzLl9jYWxjdWxhdGVFcnJvcihvdXRWZWMsIHRhcmdldC5hdChuZXcgU2VxKHN0YXJ0UG9zLCBlbmRQb3MpLCBhZi5zcGFuKSk7XG5cbiAgICAgICAgLy8gQ2hlY2sgaWYgY29udmVyZ2VuY2UgY3JpdGVyaWEgaGFzIGJlZW4gbWV0XG4gICAgICAgIGlmIChlcnIgPCBvcHRpb25zLm1heEVycm9yKSB7XG4gICAgICAgICAgICBjb25zb2xlLmxvZyhgQ29udmVyZ2VkIG9uIEVwb2M6ICR7aSArIDF9YCk7XG4gICAgICAgICAgICBicmVhaztcbiAgICAgICAgfVxuXG4gICAgICAgIGNvbnNvbGUubG9nKGBFcG9jaDogJHtpICsgMX0sIEVycm9yOiAke2Vyci50b0ZpeGVkKDQpfWApO1xuICAgIH1cblxuICAgIHJldHVybiBlcnI7XG59KTtcblxubW9kdWxlLmV4cG9ydHMgPSBBTk47Il19
