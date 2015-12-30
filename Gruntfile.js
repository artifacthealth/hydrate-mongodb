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
    grunt.loadNpmTasks('grunt-ts-clean');
    grunt.loadNpmTasks('grunt-dts-concat');

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
                    "lib/**/*.js",
                ]
            }
        },

        typescript: {
            options: {
                target: "es5",
                module: "commonjs",
                sourceMap: true,
                declaration: true,
                noImplicitAny: true
            },
            build: {
                src: ['src/**/*.ts'],
                dest: 'build/src/'
            },
            tests: {
                src: [
                    'tests/**/*.ts'
                ],
                dest: 'build/'
            },
            benchmarks: {
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
                src: [
                    "typings/**/*.ts"
                ],
                dest: "typings/"
            }
        },

        copy: {
            build: {
                files: [
                    {
                        expand: true,
                        src: [
                            "src/**/*.d.ts"
                        ],
                        dest: "build/"
                    },
                    {
                        expand: true,
                        src: [
                            "typings/**/*.d.ts"
                        ],
                        dest: "build"
                    }
                ]
            },
            lib: {
                files: [
                    {
                        expand: true,
                        cwd: 'build/src/',
                        src: [
                            '**/*.js'
                        ],
                        dest: 'lib/'
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
        },

        dts_concat: {
            lib: {
                options: {
                    name: 'hydrate',
                    main: 'build/src/hydrate.d.ts',
                    outDir: 'lib/'
                }
            }
        },

        ts_clean: {
            lib: {
                options: {
                    verbose: false
                },
                src: ['lib/**/*'],
                dot: false
            }
        }
    });

    // Default task(s).
    grunt.registerTask("default", [ "build", "lib", "tests" ]);
    grunt.registerTask("build", [ "clean:build", "copy:build", "typescript:build" ]);
    grunt.registerTask("lib", [ "clean:lib",  "copy:lib", "ts_clean:lib", "dts_concat:lib" ]);
    grunt.registerTask("tests", [ "typescript:tests", "tsreflect:typings", "tsreflect:fixtures", "mochaTest:tests" ]);
    grunt.registerTask("benchmarks", [ "typescript:benchmarks", "baseline:benchmarks" ]);

};