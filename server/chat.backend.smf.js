var mysql = require( "mysql" );

function isUrl( s )
{
  var regexp = /(ftp|http|https):\/\/(\w+:{0,1}\w*@)?(\S+)(:[0-9]+)?(\/|\/([\w#!:.?+=&%@!\-\/]))?/
  return regexp.test( s );
}

var SMFBackendExceptionCode =
{
  database: 0,
  query: 1
};

function SMFBackendException( code, message )
{
  this.code     = code;
  this.message  = message;
  this.toString = function()
  {
    return "SMFBackendException(" + this.code + "): " + this.message;
  };
}

function SMFBackend( settings, log )
{
  this.log = log;
  this.databasePool = mysql.createPool(
  {
    host:       settings.host,
    user:       settings.user,
    password:   settings.password,
    socketPath: settings.socket,
    database:   settings.db,
    charset:    "UTF8_GENERAL_CI",
    timezone:   "local",
    supportBigNumbers: true,
    bigNumberStrings:  true
  });
  this.values = {
    tablePrefix: settings.prefix,
    attachmentDir: null,
    avatarDir: null
  };
}

SMFBackend.prototype.init = function( doneCallback )
{
  var backend = this;
  this.databasePool.getConnection( function( error, connection )
  {
    if ( error || !connection )
      throw new SMFBackendException( SMFBackendExceptionCode.database, "Getting connection failed: " + error );

    var variables = [["avatar_directory","attachmentUploadDir"]];

    connection.query(
    "SELECT variable,`value` FROM " + backend.values.tablePrefix + "_settings WHERE variable IN (?)",
    variables,
    function( error, rows )
    {
      if ( error )
        throw new SMFBackendException( SMFBackendExceptionCode.query, "Settings query failed: " + error );
      if ( rows.length != variables[0].length )
        throw new SMFBackendException( SMFBackendExceptionCode.query, "Settings query is missing fields" );
      for ( var i = 0; i < rows.length; i++ )
      {
        if ( rows[i].variable == "avatar_directory" )
          backend.values.avatarDir = rows[i].value;
        else if ( rows[i].variable == "attachmentUploadDir" )
          backend.values.attachmentDir = rows[i].value;
      }
      doneCallback();
    });
    connection.release();
  });
};

SMFBackend.prototype.userQuery = function( context, username, callback )
{
  var backend = this;
  this.databasePool.getConnection( function( error, connection )
  {
    if ( error )
    {
      backend.log.error( "SMFBackend: Database error(1) on userQuery: " + error );
      callback.call( context, error, null );
    }
    else
    {
      connection.query(
      "SELECT id_member,member_name,passwd FROM " + backend.values.tablePrefix + "_members WHERE member_name = ? AND is_activated = 1",
      [ username ],
      function( error, rows )
      {
        if ( error ) {
          backend.log.error( "SMFBackend: Database error(2) on userQuery: " + error );
          callback.call( context, error, null );
          return;
        }
        if ( rows.length != 1 ) {
          callback.call( context, null, null );
          return;
        }
        var user = {
          id: rows[0].id_member,
          name: rows[0].member_name,
          hash: rows[0].passwd
        };
        callback.call( context, null, user );
      });
      connection.release();
    }
  });
};

SMFBackend.prototype.userAvatarQuery = function( context, userID, callback )
{
  var backend = this;
  this.databasePool.getConnection( function( error, connection )
  {
    if ( error )
    {
      backend.log.error( "SMFBackend: Database error(1) on userAvatarQuery: " + error );
      callback.call( context, error, null );
    }
    else
    {
      connection.query(
      "SELECT m.id_member,m.avatar,a.id_attach,a.file_hash,a.mime_type FROM " + backend.values.tablePrefix + "_members m LEFT JOIN " + backend.values.tablePrefix + "_attachments a ON a.id_member = m.id_member AND a.attachment_type = 0 WHERE m.id_member = ?",
      [ userID ],
      function( error, rows )
      {
        if ( error ) {
          backend.log.error( "SMFBackend: Database error(2) on userAvatarQuery: " + error );
          callback.call( context, error, null );
          return;
        }
        var avatar = null;
        if ( rows.length > 0 )
        {
          if ( rows[0].avatar ) {
            if ( isUrl( rows[0].avatar ) )
              avatar = {
                remote: true,
                path: rows[0].avatar,
                mime: null
              };
            else
              avatar = {
                remote: false,
                path: [backend.values.avatarDir,"/",rows[0].avatar].join( "" ),
                mime: null 
              };
          } else {
            if ( rows[0].file_hash )
              avatar = {
                remote: false,
                path: [backend.values.attachmentDir,"/",rows[0].id_attach,"_",rows[0].file_hash].join( "" ),
                mime: rows[0].mime_type
              };
          }
        }
        callback.call( context, null, avatar );
      });
      connection.release();
    }
  });
};

module.exports =
{
  create: function( settings, log )
  {
    return new SMFBackend( settings, log );
  }
};
