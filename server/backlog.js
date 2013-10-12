function Backlog( length ) {
  this.length = length;
  this.buffer = [];
  for (var i=0; i < length; i++) {
    this.buffer.push(null);
  }
  this.index = 0;
}
Backlog.prototype.push = function( value ) {
  this.buffer[this.index] = value;
  this.index > this.length-2 ? this.index = 0 : this.index++;
};
Backlog.prototype.read = function () {
  var ret = [];
  for ( var i=this.index; i < this.length; i++ ) {
    var item = this.buffer[i];
    if ( !!item ) {
      ret.push( item );
    }
  }
  for ( var j=0; j < this.index; j++ ) {
    var jtem = this.buffer[j];
    if ( !!jtem ) {
      ret.push( jtem );
    }
  }
  return ret;
};

module.exports =
{
  create: function( length )
  {
    return new Backlog( length );
  }
};
