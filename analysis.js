var tern = require('tern');
var path = require("path"),
    fs = require("fs");
var acorn = require('acorn');
var walk = require("acorn/dist/walk");

var localDir = process.cwd();
var ternServer = null;


function initTernServer(files) {
    var ternOptions = {
        async: false,
        getFile: function(file) {
            return fs.readFileSync(path.resolve(localDir, file), "utf8");
        },
        plugins: {
            requirejs: {},
            node: {}
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

}


function getQueryInfo(file, offset, type) {
    var query = {
        type: type,
        end: offset,
        file: file
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

function getType(file, offset) {
    getQueryInfo(file, offset, "type");
}

function getDefinition(file, offset) {
    getQueryInfo(file, offset, "definition");
}

function getDocumentation(file, offset) {
    getQueryInfo(file, offset, "documentation");
}

var files = ["data/test.js"];

initTernServer(files);

function analyse_all() {

    files.forEach(function(file) {
        var code = fs.readFileSync(file, 'utf8');
        var ast = acorn.parse(code);
        walk.simple(ast, {
            Identifier: function(node) {
                console.error("Here inside identifier = ", node);
                getDefinition(file, node.end);
                getType(file, node.end);
                getDocumentation(file, node.end);

            }
        });

    });

}
