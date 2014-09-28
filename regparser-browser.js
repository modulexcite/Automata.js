require=(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({"regparser":[function(require,module,exports){
var DOTSCRIPTBEGIN = 'digraph finite_state_machine {\n' + 
                     '  node [shape = circle];0\n' +
                     '  rankdir = LR;\n';

var DOTSCRIPTNODESETTING = '  node [shape = plaintext];\n' +
                           '  "" ->0 [label =\"start\"];\n' +
                           '  node [shape = circle];\n';

var DOTSCRIPTEND = '}\n';

var TOKEN_TYPE = {
  LBRACK: '(',
  RBRACK: ')',
  STAR: '*',
  PLUS: '+',
  OR: '|',
  ALTER: '?',
  END: 'EOF',
  EMPTY: 'ε',
  UNKNOWN: 'unknown',
  LETTER: 'a-z0-9',
};

function isLetterOrDigit(regChar) {
  return (regChar >= 'a' && regChar <= 'z') ||
         (regChar >= 'A' && regChar <= 'Z') ||
         (regChar >= '0' && regChar <= '9');
}

function constructGraph(startState) {
  var nfaGraph = {};
  var queue = [];
  var vis = {};
  queue.push(startState);
  while (queue.length) {
    var state = queue.shift();
    nfaGraph[state.id] = [];
    for (var i = 0; i < (state.nextStates).length; ++i) {
      var nextId = state.nextStates[i][1].id;
      var label = state.nextStates[i][0].text;
      var nextState = state.nextStates[i][1];
      nfaGraph[state.id].push([label, nextId]);
      if (nextId in vis)
        continue;
      vis[nextId] = 1;
      queue.push(state.nextStates[i][1]);
    }
  };
  return nfaGraph;
}

// class Token
function Token(type, text) {
  this.type = type;
  this.text = text;
}

var EMPTYTOKEN = new Token(TOKEN_TYPE.EMPTY, 'ε');

// class Lexer
function Lexer(regString) {
  this.regString = regString;
  this.index = 0;
};

Lexer.prototype.hasNext = function() {
  if (this.regString)
    return this.index < this.regString.length;  
  return false;
}

Lexer.prototype.nextToken = function() {
  while (this.hasNext()) {
    switch (this.regString[this.index]) {
      case ' ':
        this._consume();
        continue;
      case '(':
        this._consume();
        return new Token(TOKEN_TYPE.LBRACK, '(');
      case ')':
        this._consume();
        return new Token(TOKEN_TYPE.RBRACK, ')');
      case '+':
        this._consume();
        return new Token(TOKEN_TYPE.PLUS, '+');
      case '*':
        this._consume();
        return new Token(TOKEN_TYPE.STAR, '*');
      case '?':
        this._consume();
        return new Token(TOKEN_TYPE.ALTER, '?');
      case '|':
        this._consume();
        return new Token(TOKEN_TYPE.OR, '|');
      default:
        if (isLetterOrDigit(this.regString[this.index])) 
           return new Token(TOKEN_TYPE.LETTER, this.regString[this.index++]);
        else
           throw new Error('Unknown type of ' + this.regString[this.index]);
    }
  }
  return new Token(TOKEN_TYPE.END, 'EOF'); 
}

Lexer.prototype._consume = function() {
  return ++this.index;
}

// class NFAState
function NFAState(id, isAccept) {
  this.id = id;
  this.isAccept = isAccept;
  this.nextStates = [];
};

NFAState.prototype.addStates = function(token, state) {
  this.nextStates.push([token, state]);
}

// class NFA
function NFA(startState, endState) {
  this.startState = startState;
  this.endState = endState;
};

NFA.prototype._emptyClosure = function(nfaStates, nfaGraph) {
  var closure = [];
  var stack = [];
  for (var i = 0; i < nfaStates.length; ++i) {
    stack.push(nfaStates[i]);
    closure.push(nfaStates[i]);
  }
  while (stack.length) {
    var stateId = stack.shift();
    for (var i = 0; i < nfaGraph[stateId].length; ++i) {
      var nextId = nfaGraph[stateId][i][1];
      var label = nfaGraph[stateId][i][0];
      if (label == TOKEN_TYPE.EMPTY &&
          closure.indexOf(nextId) == -1) {
        closure.push(nextId);
        stack.push(nextId);
      }
    }
  }
  closure.sort(function(a, b) {
    return a < b;
  });
  return closure;
}

NFA.prototype._move = function(dfaState, letter, id2States, nfaGraph) {
  var stateArray = id2States[dfaState.id];
  var result = [];
  for (var i = 0; i < stateArray.length; ++i) {
    var id = stateArray[i];
    for (var k = 0; k < nfaGraph[id].length; ++k) {
      var label = nfaGraph[id][k][0];
      if (label == letter) {
        result.push(nfaGraph[id][k][1]);
      }
    }
  }
  result.sort(function(a, b) {
    return a < b;
  });
  return result;
}

NFA.prototype.toDFA = function() {
  var nfaGraph = constructGraph(this.startState);
  var alphabetTable = {};
  for (var id in nfaGraph)
    for (var j = 0; j < nfaGraph[id].length; ++j) {
      var label = nfaGraph[id][j][0];
      if (!alphabetTable.hasOwnProperty(label) &&
          label != TOKEN_TYPE.EMPTY)
        alphabetTable[label] = 1;
    }

  // {id:
  //  nextStates: {
  //    label:"",
  //    nextStatesId: [id1, id2, id3],
  //    vis: true,
  //    accept: true
  //  }
  // }
  var dStates = [];
  var states2Id = {}; // [1, 2, 3] => id
  var id2States = {}; // id => [1, 2, 3]
  var id = 0;
  var closure = this._emptyClosure([this.startState.id], nfaGraph);
  states2Id[JSON.stringify(closure)] = id;
  id2States[id] = closure;
  dStates.push({id: id++, nextStates: {}, vis: false});

  if (closure.indexOf(this.endState.id) != -1)
    dStates[dStates.length-1].accept = true;

  var unvisCnt = 1;
  while (unvisCnt)  {
    var unvisState;
    unvisState = dStates.filter(function(state) {
      return !state.vis;
    })[0];
    unvisState.vis = true;
    --unvisCnt;
    for (var letter in alphabetTable) {
      if (letter == TOKEN_TYPE.EMPTY)
        continue;

      var nextStates = this._emptyClosure(
          this._move(unvisState, letter, id2States, nfaGraph), nfaGraph);

      if (!nextStates.length)
        continue;
      var nextStatesString = JSON.stringify(nextStates);
      if (!states2Id.hasOwnProperty(nextStatesString)) {
        var isAccept = nextStates.indexOf(this.endState.id) != -1;
        states2Id[nextStatesString] = id;
        id2States[id] = nextStates;
        if (isAccept)
          dStates.push({id: id++, nextStates: {}, vis: false, accept: true});
        else
          dStates.push({id: id++, nextStates: {}, vis: false});
        ++unvisCnt;
      }

      unvisState.nextStates[letter] = nextStates;
    }
  }

  var dfa = new FSM();
  for (var i = 0; i < dStates.length; ++i) {
    dfa.states.push({name:dStates[i].id});
    if (dStates[i].initial)
      dfa.states[dfa.states.length-1].initial = true;
    if (dStates[i].accept)
      dfa.states[dfa.states.length-1].accept = true;

    for (var letter in alphabetTable) {
      if (!dStates[i].nextStates[letter]) continue;
      var arrayId = [];
      for (var j = 0; j < dStates[i].nextStates[letter].length; ++j)
        arrayId.push(dStates[i].nextStates[letter][j]);
      if (arrayId.length)
        dfa.transitions.push({from: dStates[i].id,
                              to: states2Id[JSON.stringify(arrayId)],
                              label:letter});
    }
  }
  return dfa;
}

// class FSM, represent a finite state machine.
// format:
//   {
//      state: [{name:"xx", initial: true},
//              {name:"XX"}, ...,
//              {name:"XX", accept: true} ],
//      transition: [{from: "", to: "", label:""}]
//   }
function FSM() {
  this.states = [];
  this.transitions = [];
};

FSM.prototype.toDotScript = function() {
  var dotScript = "";
  for (var i = 0; i < this.transitions.length; ++i) {
    dotScript += '  ' + this.transitions[i].from + '->' + 
        this.transitions[i].to + ' [label="' + 
        this.transitions[i].label  + '"];\n';
  }
  var endStateId;
  for (var i = 0; i < this.states.length; ++i) {
    if (this.states[i].accept) {
      endStateId = this.states[i].name;
    }
  }
  return DOTSCRIPTBEGIN + "  node [shape = doublecircle];" + endStateId + ";\n"
      + DOTSCRIPTNODESETTING + dotScript + DOTSCRIPTEND;
};

// class Parser
function RegParser(regString) {
  this.nfa = null;
  this.id = 0;
  this.lexer = new Lexer(regString);
  this.lookHead = this.lexer.nextToken();
}

RegParser.prototype.clear = function() {
  this.nfa = null;
  this.id = 0;
  this.lexer = null;
  this.lookHead = null;
}

RegParser.prototype.reset = function(regString) {
  this.nfa = null;
  this.id = 0;
  this.lexer = new Lexer(regString);
  this.lookHead = this.lexer.nextToken();
}

RegParser.prototype.parseToNFA = function() {
  this.nfa = this._expression();
  this._reorderNFAStateId();
  return this._traversalFSM();
}

RegParser.prototype.parseToDFA = function() {
  var fsm = this.parseToNFA();
  return this.nfa.toDFA();
}

RegParser.prototype._traversalFSM = function() {
  var fsm = new FSM();
  var queue = []; 
  var vis = {};
  queue.push(this.nfa.startState);
  fsm.states.push({name: this.nfa.startState.id, initial: true});
  vis[this.nfa.startState.id] = 1;
  while (queue.length) {
    var state = queue.shift();
    for (var i = 0; i < (state.nextStates).length; ++i) {
      var nextId = state.nextStates[i][1].id;
      var label = state.nextStates[i][0].text;
      var nextState = state.nextStates[i][1];
      fsm.transitions.push({from: state.id, to: nextId, label: label});
      if (nextId in vis)
        continue;
      vis[nextId] = 1;
      if (nextState.isAccept)
        fsm.states.push({name: nextId, accept: true});
      else
        fsm.states.push({name: nextId});
      queue.push(state.nextStates[i][1]);
    }
  }
  return fsm;
}

RegParser.prototype._reorderNFAStateId = function() {
  var queue = []; 
  var vis = {};
  queue.push(this.nfa.startState);
  this.id = 0;
  vis[this.nfa.startState.id] = 1;
  while (queue.length) {
    var state = queue.shift();
    state.id = this.id++;  
    for (var i = 0; i < (state.nextStates).length; ++i) {
      var nextId = state.nextStates[i][1].id;
      if (nextId in vis)
        continue;
      vis[nextId] = 1;
      queue.push(state.nextStates[i][1]);
    }
  }
}

RegParser.prototype._expression = function() {
  var factorNFA = this._factor();
  if (this.lookHead.type == TOKEN_TYPE.LETTER ||
      this.lookHead.type == TOKEN_TYPE.LBRACK) {
    var subNFA = this._expression();
    factorNFA.endState.isAccept = false;
    factorNFA.endState.id = subNFA.startState.id;
    factorNFA.endState.nextStates = subNFA.startState.nextStates;
    subNFA.startState = null;
    return new NFA(factorNFA.startState, subNFA.endState);
  } 
  return factorNFA;
}

RegParser.prototype._factor = function() {
  var termNFA = this._term();
  if (this.lookHead.type == TOKEN_TYPE.PLUS) { // case +
    var nfa = new NFA(new NFAState(this.id++, false), new NFAState(this.id++, true));
    termNFA.endState.isAccept = false;
    nfa.startState.addStates(EMPTYTOKEN, termNFA.startState); 
    termNFA.endState.addStates(EMPTYTOKEN, termNFA.startState);
    termNFA.endState.addStates(EMPTYTOKEN, nfa.endState);
    this._match(TOKEN_TYPE.PLUS);

    return nfa;
  } else if (this.lookHead.type == TOKEN_TYPE.STAR) { // case *
    var nfa = new NFA(new NFAState(this.id++, false), new NFAState(this.id++, true));
    termNFA.endState.isAccept = false;

    nfa.startState.addStates(EMPTYTOKEN, termNFA.startState);
    nfa.startState.addStates(EMPTYTOKEN, nfa.endState); 
    termNFA.endState.addStates(EMPTYTOKEN, nfa.endState);
    termNFA.endState.addStates(EMPTYTOKEN, termNFA.startState);
     
    this._match(TOKEN_TYPE.STAR);
    return nfa; 
  } else if (this.lookHead.type == TOKEN_TYPE.OR) { // case |
    this._match(TOKEN_TYPE.OR);
     
    var factorNFA = this._factor();
    var nfa = new NFA(new NFAState(this.id++, false), new NFAState(this.id++, true));
    termNFA.endState.isAccept = false;
    factorNFA.endState.isAccept = false;

    nfa.startState.addStates(EMPTYTOKEN, termNFA.startState);
    nfa.startState.addStates(EMPTYTOKEN, factorNFA.startState);
    termNFA.endState.addStates(EMPTYTOKEN, nfa.endState);
    factorNFA.endState.addStates(EMPTYTOKEN, nfa.endState);
    
    return nfa;
  } else if (this.lookHead.type == TOKEN_TYPE.ALTER) { // case ?
    var nfa = new NFA(new NFAState(this.id++, false), new NFAState(this.id++, true));
    termNFA.endState.isAccept = false;

    nfa.startState.addStates(EMPTYTOKEN, termNFA.startState);
    nfa.startState.addStates(EMPTYTOKEN, nfa.endState); 
    termNFA.endState.addStates(EMPTYTOKEN, nfa.endState);
     
    this._match(TOKEN_TYPE.ALTER);
    return nfa; 
  } else if (this.lookHead.type == TOKEN_TYPE.Unknown) {
    throw new Error("Unknown symbol: " + this.lookHead.text);
  }
  return termNFA;
}

RegParser.prototype._term = function() {
  if (this.lookHead.type == TOKEN_TYPE.LETTER) {
    var nfa = new NFA(new NFAState(this.id++, false), new NFAState(this.id++, true));
    nfa.startState.addStates(this.lookHead, nfa.endState);
    this._match(TOKEN_TYPE.LETTER);
    return nfa;
  } else if (this.lookHead.type == TOKEN_TYPE.LBRACK) {
    this._match(TOKEN_TYPE.LBRACK);
    var nfa = this._expression();
    this._match(TOKEN_TYPE.RBRACK);
    return nfa;
  } else {
    throw new Error('Invalid term: ' + this.lookHead.text);
  }
}

RegParser.prototype._match = function(type) {
  if (this.lookHead.type == type)
    this._consume();
  else
    throw new Error('Cannot match type: ' + this.lookHead.text);
}

RegParser.prototype._consume = function(type) {
  this.lookHead = this.lexer.nextToken();
}

module.exports.RegParser = RegParser;
module.exports.Lexer = Lexer;
module.exports.FSM = FSM;

},{}]},{},[]);