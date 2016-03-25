var tern = require('tern');
var path = require("path"),
    fs = require("fs");
var acorn = require('acorn');
var walk = require("acorn/dist/walk");
var infer = require('tern/lib/infer');

var defnode = require('defnode');

var localDir = process.cwd();
var ternServer = null;

var out = {
    Defs: [],
    Refs: [],
    Docs: []
}


function initTernServer(files) {
    var ternOptions = {
        async: false,
        getFile: function(file) {
            return fs.readFileSync(path.resolve(localDir, file), "utf8");
        },
        loadEagerly: [
            "data/test.js",
            "data/test1.js"
        ],
        plugins: {
            "node": {},
            "requirejs": {},
            "modules": {},
            "es_modules": {},
            "commonjs": {}
        }
    };
    ternServer = new tern.Server(ternOptions);


    console.error("Files = ", files)
    files.forEach(function(file) {
        ternServer.addFile(file);
    });

    ternServer.flush(function(err) {
        if (err) throw err;
        analyse_all();
    });
    //console.error(ternServer);
    //console.error(ternServer.files);

    //console.error("CTX = ", infer.cx());

}


function getQueryInfo(file, offset, type, start) {
    var query = {
        type: type,
        start: start,
        end: offset,
        file: file,
        origin: "data/test.js"
    }
    ternServer.request({
        query: query,
        offset: offset
    }, function(error, data) {
        if (error) {
            console.error("Error returned from Tern 'definition' request: " + error);
            return;
        }
        console.error("DATA for ", type, " = ", data);

    });
}

function getType(file, offset, start) {
    getQueryInfo(file, offset, "type", start);
}

function getDefinition(file, offset, start) {
    getQueryInfo(file, offset, "definition", start);
}

function getCompletions(file, offset, start) {
    getQueryInfo(file, offset, "completions", start);
}

function getDocumentation(file, offset) {
    getQueryInfo(file, offset, "documentation");
}

var files = ["data/test.js", "data/test1.js"];

initTernServer(files);

function form_path(id) {
    return id.sourceFile.name + "_" + id.start + "_" + id.end;
}


function analyse_all() {

    var searchVisitor = walk.make({
        Function: function(node, st, c) {
            if (node.id) {
                c(node.id, st);

                console.error("Function id = ", node.id);
                //emit fn def here
                // var fnDef = {
                //     Path: form_path(node.id),
                //     Name: node.id.name,
                //     Kind: "fn",
                //     File: decl.sourceFile.name,
                //     DefStart: decl.id.start,
                //     DefEnd: decl.id.end,
                //     TreePath: form_path(decl.id)
                // }
                //out.Defs.push(fnDef);

            }

            for (var i = 0; i < node.params.length; ++i)
                c(node.params[i], st);
            c(node.body, st);
        },
        ExpressionStatement: function(node, st, c) {
            console.error(node);
        },

        // TryStatement: function(node, st, c) {
        //     if (node.handler)
        //         c(node.handler.param, st);
        //     walk.base.TryStatement(node, st, c);

        // },

        VariableDeclaration: function(node, st, c) {
            for (var i = 0; i < node.declarations.length; ++i) {
                var decl = node.declarations[i];

                //emit var def here
                var varDef = {
                    Path: form_path(decl.id),
                    Name: decl.id.name,
                    Kind: "var",
                    File: decl.sourceFile.name,
                    DefStart: decl.id.start,
                    DefEnd: decl.id.end,
                    TreePath: form_path(decl.id)
                }
                out.Defs.push(varDef);

                c(decl.id, st);
                if (decl.init) c(decl.init, st);
            }
        },
        Identifier: function(node, file, c) {

            console.error("Here inside identifier = ", node.name);
            // var wordStart = node.start;
            // var exprAt = infer.findExpressionAround(file.ast, null, wordStart, file.scope);
            // console.error("Id = ", node.name);
            // try {
            //     //console.error("DEFINITON = ", defnode.findOriginPseudonode(file.ast, node.start, node.end));
            //     console.error("DEFINITON = ", defnode.findNameNodes(file.ast, node.start, node.end));
            // } catch (e) {
            //     console.error(e);
            // }
            //console.error("DEFINITON = ", defnode.findDefinitionNode(file.ast, node.start, node.end));
            // console.error("expr = ", exprAt);
            // var memberExpr, objLit;
            // Decide whether this is an object property, either in a member
            // expression or an object literal.
            // if (exprAt) {
            //     var exprNode = exprAt.node;
            //     if (exprNode.type == "MemberExpression" && exprNode.object.end < wordStart) {
            //         memberExpr = exprAt;
            //     }
            //     if (memberExpr) {
            //         prop = memberExpr.node.property;
            //         prop = prop.type == "Literal" ? prop.value.slice(1) : prop.name;
            //         memberExpr.node = memberExpr.node.object;
            //         objType = infer.expressionType(memberExpr);
            //         console.error("property = ", prop);
            //         console.error("TYPE = ", objType);
            //     }
            //console.error(node);
            //console.error("ID = ", node.name, "FILE = ", node.sourceFile.name);
            //getDefinition(file.name, node.end, node.start);
            //getCompletions(file.name, node.end, node.start);
            //getType(st, node.end, node.start);
            //getCompletions(st, node.end, node.start);
            //console.error(st);
            // var expr;
            // try {
            //     expr = tern.findQueryExpr(st, ident);
            // } catch (e) {
            //     console.error('No expression at ' + st.name + ':' + node.start + '-' + node.end);
            //     return null;
            // }
            //console.error("Query expr = ", tern.findQueryExpr(st, node));

        }
    });

    var fullVisitor = walk.make({
        MemberExpression: function(node, st, c) {
            c(node.object, st, "Expression");
            c(node.property, st);
        },
        ObjectExpression: function(node, st, c) {
            for (var i = 0; i < node.properties.length; ++i) {
                c(node.properties[i].value, st);
                c(node.properties[i].key, st);
            }
        }
    }, searchVisitor);




    // var visitor = {
    //     FunctionDeclaration: function(node) {
    //         console.error("FN DECL");
    //         console.error(node);
    //         walk.simple(node.body, visitor);
    //         //walk.simple(node.params, visitor);

    //     },

    //     Identifier: function(node) {
    //         console.error("Here inside identifier = ", node);
    //     }
    // };

    ternServer.files.forEach(function(file) {
        //var code = fs.readFileSync(file, 'utf8');
        //var ast = acorn.parse(code);
        //console.error("AST = ", ast);
        //console.error(file.ast);
        walk.recursive(file.ast, file, null, fullVisitor);
        //walk.simple(ast, visitor);

    });

    //console.error("DEFS = ", out.Defs);
}
