# Reg2Automata.js

Reg2Automata.js is a regular expression converter written in JS for both Node.js and browser.

It aims to convert regular expression to finite state machine(FSM, like NFA).
Besides, dot script transition is provided so that you can make diagrams with [Graphiz][1].

## API Desciption

Currently, Reg2Automata.js supports minimal regular expression with `+`, `*`, `?`, `()`.

###FSM

`FSM` is a object represent a finite state machine, json definition is below:

```
{
   states: [
     {name:"0", initial: true},
     {name:"1"},
     {name:"2", end, true} ],
   Ntransitions: [
     {from: "0", to: "1", label:"a"},
     {from: "1", to: "2", label:"b"}
   ]
}
```

#### FSM.toDotScript()

Convert the fsm to Graphiz dot script.


###RegParser

RegParser is a regular expression parser.

####RegParser.reset(string)

Set regular expression `string` in parser.

####RegParser.parseToNFA()

Parses the given regular expression.
Returns a `FSM` object, the `FSM` is a Nondeterministic Finite Automata(NFA).

## Usage 

###Usage in Node.js

```
var regParser = require('regparser');

var parser = new regParser.RegParser('a*b');
var nfa = parser.parseToNFA();

nfa.toDotScript();
```

###Usage in Browser

Reg2Automata uses [node-browserify][2] to generate a browser distribution.

You can use [Viz.js][3] to render [graphiz dot script][4] in your web page.

```
var regParser = require('regparser');

var parser = new regParser.RegParser('a*b');
var nfa = regParser.parseToNFA();

// render dot script to svg.
var result = Viz(nfa.toDotScript(), 'svg', 'dot');
```

[1]:http://www.graphviz.org/
[2]:https://github.com/substack/node-browserify
[3]:https://github.com/mdaines/viz.js/
[4]:http://www.graphviz.org/content/dot-language