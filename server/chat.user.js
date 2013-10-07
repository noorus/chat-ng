function User( id, name, avatar )
{
  this.id = id;
  this.name = name;
  this.avatar = avatar;
}

User.prototype.toJSON = function()
{
  return {
    id: this.id,
    name: this.name,
    avatar: this.avatar
  }
}

module.exports =
{
  create: function( id, name, avatar )
  {
    return new User( id, name, avatar );
  }
};