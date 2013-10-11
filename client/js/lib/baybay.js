define(function()
{
  function BBCodeParseError( message )
  {
    this.message = message;
  }
  function BBTagInstance( tag, close )
  {
    this.tag = tag;
    this.close = close;
  }
  BBTagInstance.prototype.render = function()
  {
    return this.tag.render( this.close );
  };
  function BBSimpleTag( tag )
  {
    this.tag = tag;
    this.render = function( close )
    {
      return "<" + ( close ? "/" : "" ) + this.tag + ">";
    };
  }
  function BBCode()
  {
    this._stack = [];
    this._tags = [
      new BBSimpleTag( "b" ),
      new BBSimpleTag( "i" ),
      new BBSimpleTag( "u" )
    ];
  }
  BBCode.prototype.parseTag = function( content )
  {
    if ( !content )
      return null;
    var close = ( content[0] == "/" );
    if ( close )
      content = content.substr( 1 );
    content = content.split( "=" );
    for ( var i = 0; i < this._tags.length; i++ )
    {
      if ( this._tags[i].tag == content[0] )
      {
        var tag = new BBTagInstance( this._tags[i], close );
        return tag;
      }
    }
    return null;
  };
  BBCode.prototype.parse = function( content )
  {
    var parsed = "";
    var i = 0;
    var len = content.length;
    while ( i < len )
    {
      if ( content[i] == "[" )
      {
        var close = content.indexOf( "]", i + 1 );
        var next  = content.indexOf( "[", i + 1 );
        if ( close < 0 || ( next >= 0 && next < close ) )
        {
          // You don't often wish for goto in a language, but I guess this is one of those times
          parsed += content[i];
          i++;
          continue;
        }
        if ( close > 0 )
        {
          var sub = content.substr( i + 1, close - i - 1 );
          var instance = this.parseTag( sub );
          if ( instance !== null )
          {
            if ( !instance.close )
              this._stack.push( instance );
            else
            {
              if ( this._stack.length < 1 )
              {
                parsed += content[i];
                i++;
                continue;
              }
              if ( this._stack[this._stack.length-1].tag.tag != instance.tag.tag )
                throw new BBCodeParseError( "Mismatched tags" );
              this._stack.pop();
            }
            parsed += instance.render();
            i += sub.length + 2;
            continue;
          }
        }
      }
      parsed += content[i];
      i++;
    }
    if ( this._stack.length > 0 )
    {
      for ( i = this._stack.length - 1; i >= 0; i-- )
      {
        var instance = this._stack[i];
        instance.close = true;
        parsed += instance.render();
      }
    }
    return parsed;
  };
  return BBCode;
});