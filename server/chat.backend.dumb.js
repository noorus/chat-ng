var crypto = require("crypto");

var DumbBackend = function (settings, log) {
    this.log = log;
}
DumbBackend.prototype.init = function(doneCallback) { 
    doneCallback.call(); 
};
DumbBackend.prototype.userQuery = function(ctx, username, cb) {
    var hash = crypto.createHash("sha1");
    hash.update(username);
    var digest = hash.digest("hex");
    this.log.debug("getting user " + username);
    cb.call(ctx, null, {
	id: 1337, 
	name: username, 
	hash: digest });
};
DumbBackend.prototype.userAvatarQuery = function(ctx, userid, cb) {
    cb.call(ctx, null, {
	remote: false, 
	path: "/dumbAvatar.jpg?userid=" + userid, 
	mime: "image/jpeg"});
};

module.exports =
{
  create: function( settings, log )
  {
    return new DumbBackend( settings, log );
  }
};
