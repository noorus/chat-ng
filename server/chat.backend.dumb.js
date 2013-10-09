var crypto = require("crypto");

var DumbBackend = function (settings, log) {
    this.log = log;
    this.next_userid = 1337;
}
DumbBackend.prototype.init = function(doneCallback) { 
    doneCallback.call(); 
};
DumbBackend.prototype.userQuery = function(ctx, username, cb) {
    var hash = crypto.createHash("sha1");
    hash.update(username);
    var digest = hash.digest("hex");
    this.log.debug("getting user " + username + " (" + this.next_userid + ")");
    cb.call(ctx, null, {
	id: this.next_userid,
	name: username, 
	hash: digest });
    this.next_userid++;
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
