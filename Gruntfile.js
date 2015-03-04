module.exports = function(grunt) {

    grunt.loadNpmTasks("grunt-contrib-clean");
    grunt.loadNpmTasks("grunt-baseline");
    grunt.loadNpmTasks("grunt-typescript");
    grunt.loadNpmTasks("grunt-contrib-watch");
    grunt.loadNpmTasks("grunt-contrib-concat");
    grunt.loadNpmTasks("grunt-contrib-copy");
    grunt.loadNpmTasks("grunt-mocha-test");
    grunt.loadNpmTasks("grunt-tsreflect");
    grunt.loadNpmTasks("grunt-shell");

    // Project configuration.
    grunt.initConfig({
        pkg: grunt.file.readJSON("package.json"),

        clean: {
            build: {
                src: [
                    "build/"
                ]
            },
            lib: {
                src: [
                    "lib/hydrate.js"
                ]
            },
            typings: {
                src: [
                    "typings/*.d.json"
                ]
            }
        },

        typescript: {
            build: {
                options: {
                    target: "es5",
                    module: "commonjs",
                    sourceMap: true,
                    declaration: false,
                    noImplicitAny: true
                },
                src: ['src/**/*.ts'],
                dest: 'build/'
            },
            tests: {
                options: {
                    target: "es5",
                    module: "commonjs",
                    sourceMap: true,
                    noImplicitAny: true
                },
                src: [
                    'tests/**/*.ts'
                ],
                dest: 'build/'
            },
            benchmarks: {
                options: {
                    target: "es5",
                    module: "commonjs",
                    sourceMap: true,
                    noImplicitAny: true
                },
                src: [
                    'benchmarks/**/*.ts'
                ],
                dest: 'build/'
            }
        },

        concat: {
            lib: {
                options: {
                    banner: grunt.file.read("COPYRIGHT.txt")
                },
                src: [
                    'build/hydrate.js'
                ],
                dest: 'lib/hydrate.js'
            }
        },

        tsreflect: {
            build: {
                src: [
                    "src/**/*.ts"
                ],
                dest: "build/src/"
            },
            fixtures: {
                src: [
                    "tests/fixtures/**/*.ts"
                ],
                dest: "build/tests/fixtures/"
            },
            typings: {
                options: {
                    noLib: false,
                    removePrivates: true
                },
                src: [
                    "typings/mongodb.d.ts",
                    "typings/node.d.ts"
                ]
            }
        },

        copy: {
            typings: {
                files: [
                    {
                        expand: true,
                        cwd: 'typings/',
                        src: [
                            "*.d.json"
                        ],
                        dest: 'build/src/'
                    }
                ]
            }
        },

        mochaTest: {
            tests: {
                options: {
                    reporter: 'spec'
                },
                src: ['build/tests/**/*.tests.js']
            }
        },

        baseline: {
            benchmarks: {
                options: {
                    baselinePath: "baseline.json",
                    useColors: true
                },
                src: [
                    "build/benchmarks/**/*.bench.js"
                ]
            }
        }
    });

    // Default task(s).
    grunt.registerTask("default", [ "build", "lib", "tests" ]);
    grunt.registerTask("build", [ "clean:build", "typescript:build" ]);
    grunt.registerTask("lib", [ "clean:lib", "concat:lib" ]);
    grunt.registerTask("tests", [ "typescript:tests", "tsreflect:fixtures", "mochaTest:tests" ]);
    grunt.registerTask("benchmarks", [ "typescript:benchmarks", "baseline:benchmarks" ]);

};