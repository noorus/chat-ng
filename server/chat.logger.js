var levels = [ "error", "warn", "info", "debug" ];
var colors = [ 31, 33, 36, 90 ];

function toArray( enu )
{
  var arr = [];
  for ( var i = 0, j = enu.length; i < j; i++ )
    arr.push( enu[i] );
  return arr;
}

function pad( str )
{
  var max = 0;
  for ( var i = 0, j = levels.length; i < j; i++ )
    max = Math.max( max, levels[i].length );
  return ( str.length < max ? str + new Array( max - str.length + 1 ).join( " " ) : str );
}

function LoggerNg( options )
{
  options = options || {};
  this.colors = false !== options.colors;
  this.level = 3;
  this.enabled = true;
};

LoggerNg.prototype.log = function( type )
{
  var index = levels.indexOf( type );
  if ( index > this.level || !this.enabled )
    return this;
  console.log.apply( console,
    [this.colors ? '   \033[' + colors[index] + 'm' + pad( type ) + ' -\033[39m' : type + ':'].concat( toArray( arguments ).slice( 1 ) )
  );
  return this;
};

levels.forEach( function( name )
{
  LoggerNg.prototype[name] = function()
  {
    this.log.apply( this, [name].concat( toArray( arguments ) ) );
  };
} );

module.exports =
{
  create: function( options )
  {
    return new LoggerNg( options );
  }
};