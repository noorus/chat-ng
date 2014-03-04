var UserLevel =
{
  regular: 0,
  moderator: 1,
  administrator: 2
};

function User( id, name, avatar, level )
{
  this.id = id;
  this.name = name;
  this.avatar = avatar;
  this.level = level;
  console.log( "Created user with id " + id + " name " + name + " level " + level );
}

User.prototype.toJSON = function()
{
  return {
    id: this.id,
    name: this.name,
    avatar: this.avatar,
    level: this.level
  }
}

module.exports =
{
  userLevel: UserLevel,
  create: function( id, name, avatar, level )
  {
    return new User( id, name, avatar, level );
  }
};