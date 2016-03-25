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

                //console.error("Function id = ", node.id);
                //emit fn def here
                var fnDef = {
                    Path: form_path(node.id),
                    Name: node.id.name,
                    Kind: "fn",
                    File: decl.sourceFile.name,
                    DefStart: decl.id.start,
                    DefEnd: decl.id.end,
                    TreePath: form_path(decl.id)
                }
                out.Defs.push(fnDef);
            }

            for (var i = 0; i < node.params.length; ++i)
                c(node.params[i], st);
            c(node.body, st);
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
        MemberExpression: function(node, st, c) {
           // console.error('member expr =', node);
            c(node.object, st, "Expression");
            c(node.property, st);
        },
        ObjectExpression: function(node, st, c) {
            for (var i = 0; i < node.properties.length; ++i) {
                c(node.properties[i].value, st);
                c(node.properties[i].key, st);
            }
        },
        Identifier: function(node, file, c) {
            //console.error("Here inside identifier = ", node);
            var ref = {
                DefPath: form_path(node),
                Def: false,
                File: node.sourceFile.name,
                Start: node.start,
                End: node.end
            }
            out.Refs.push(ref);
        }
    });


    ternServer.files.forEach(function(file) {
        //console.error(file.ast);
        walk.recursive(file.ast, file, null, searchVisitor);
    });

    console.error("DEFS = ", out.Defs);
    console.error("REFS = ", out.Refs);
}
