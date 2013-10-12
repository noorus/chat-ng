define(function()
{
  var StateMachine = function()
  {
    this._states = [];
  };
  StateMachine.prototype.changeState = function( newState )
  {
    if ( this._states.length > 0 ) {
      state = this.getState();
      if ( state == newState )
        return false;
      this._states.pop();
      this.onLeaveState( state );
    }
    this._states.push( newState );
    this.onEnterState( newState );
    return true;
  };
  StateMachine.prototype.pushState = function( newState )
  {
    state = this.getState();
    if ( state !== null )
      this.onLeaveState( state );
    this._states.push( newState );
    this.onEnterState( newState );
  };
  StateMachine.prototype.popState = function()
  {
    if ( this._states.length > 0 ) {
      state = this._states.pop();
      this.onLeaveState( state );
    }
    state = this.getState();
    if ( state !== null )
      this.onEnterState( state );
  };
  StateMachine.prototype.getState = function()
  {
    if ( this._states.length < 1 )
      return null;
    return this._states[this._states.length-1];
  };
  function StateMachineModule()
  {
  }
  StateMachineModule.prototype.create = function()
  {
    return new StateMachine();
  };
  return new StateMachineModule();
});
