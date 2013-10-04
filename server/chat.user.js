function User( id, name )
{
  this.id = id;
  this.name = name;
}

User.prototype.toJSON = function()
{
  return {
    id: this.id,
    name: this.name
  }
}

module.exports =
{
  create: function( id, name )
  {
    return new User( id, name );
  }
};