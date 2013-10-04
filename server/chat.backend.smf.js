var mysql = require( "mysql" );

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
}

SMFBackend.prototype.userQuery = function( context, username, callback )
{
  this.databasePool.getConnection( function( error, connection )
  {
    if ( error )
    {
      this.log.error( "SMFBackend: Database error(1) on userQuery: " + error );
      callback.call( context, error, null );
    }
    else
    {
      connection.query(
      "SELECT id_member,member_name,passwd FROM smf_members WHERE member_name = ?",
      [ username ],
      function( error, rows )
      {
        if ( error ) {
          this.log.error( "SMFBackend: Database error(2) on userQuery: " + error );
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

module.exports =
{
  create: function( settings, log )
  {
    return new SMFBackend( settings, log );
  }
};