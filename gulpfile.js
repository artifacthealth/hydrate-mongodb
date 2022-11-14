// enable source map support in node stack traces
require("source-map-support").install();

var gulp = require('gulp');
var sourcemaps = require('gulp-sourcemaps');
var ts = require('gulp-typescript');
var del = require('del');
var mocha = require("gulp-mocha");
var merge = require("merge2");
var runSequence = require("run-sequence");
var Baseline = require("baseline");
var typedoc = require("gulp-typedoc");
var istanbul = require("gulp-istanbul");
var plumber = require("gulp-plumber");
var util = require("gulp-util");

var tsProject = ts.createProject('./tsconfig.json', {
    typescript: require("typescript")
});

// monkey patch Gulp 'src' function to include 'gulp-plumber' for proper error handling on all tasks
// see: https://www.timroes.de/2015/01/06/proper-error-handling-in-gulp-js/
var gulp_src = gulp.src;
gulp.src = function() {
    return gulp_src.apply(gulp, arguments)
        .pipe(plumber((error) => {
            process.nextTick(() => {
                util.log(util.colors.red("Exiting build due unhandled to error:\n") + error.toString());
                process.exit(1);
            });
        }));
};

function clean() {
    return del(['build', 'lib']);
}

function lib() {

    return gulp.src(['build/src/**/*.js', "build/src/**/*.d.ts", "src/**/*.d.ts", "package.json", "*.txt", "*.md" ])
        .pipe(gulp.dest('lib'));
}

function test() {
    return gulp.src('build/tests/**/*.tests.js', {read: false})
        .pipe(mocha());
}

function bench(done) {

    var baseline = new Baseline();
    baseline.reporter = new Baseline.DefaultReporter();
    baseline.useColors = true;
    baseline.baselinePath = "baseline.json";
    baseline.files = [ "build/benchmarks/sessionImpl.bench.js" ];
    baseline.run(function(err, slower) {
        done(err);
        process.exit(slower);
    });
}

function docs() {
    return gulp.src(['typings/**/*.ts', 'src/**/*.ts']).pipe(typedoc({
        target: 'es6',
        module: "commonjs",
        out: 'build/docs',
        mode: "file",
        name: "hydrate-mongodb",
        umlFormat: "svg",
        includeDeclarations: false,
        excludeExternals: true,
        excludeNotExported: true
    }));
}

function releaseDocs() {

    return gulp.src(['build/docs/**/*.*' ])
        .pipe(gulp.dest('docs'));
}

function preCoverage() {
    return gulp.src(['build/src/**/*.js'])
        // Covering files
        .pipe(istanbul())
        // Force `require` to return covered files
        .pipe(istanbul.hookRequire());
}
function tsCompile() {

    var tsResult = gulp.src(['typings/**/*.ts', 'src/**/*.ts', 'tests/**/*.ts', 'benchmarks/**/*.ts'], { base: process.cwd() })
        .pipe(tsProject());

    return merge([
        tsResult.dts.pipe(gulp.dest('build')),
        tsResult.js.pipe(gulp.dest('build'))
    ]);
}

exports.clean = clean;

// Performs build without sourcemaps but includes dts files
exports.build = gulp.series(clean, tsCompile);

exports.releaseDocs = gulp.series(docs, releaseDocs);

exports.coverage = gulp.series(preCoverage, function () {
    return gulp.src(['build/tests/**/*.tests.js'])
        .pipe(mocha())
        // Creating the reports after tests ran
        .pipe(istanbul.writeReports("build/coverage"))
        // Enforce a coverage of at least 90%
        .pipe(istanbul.enforceThresholds({ thresholds: { global: 90 } }));
});

// Performs build with sourcemaps
exports.debug = gulp.series(clean, function() {

    return gulp.src(['typings/**/*.ts', 'src/**/*.ts', 'tests/**/*.ts', 'benchmarks/**/*.ts'], { base: process.cwd() })
        .pipe(sourcemaps.init())
        .pipe(tsProject())
        .pipe(sourcemaps.write('.', {includeContent: false, sourceRoot: process.cwd() }))
        .pipe(gulp.dest('build'));
});

exports.bench = bench;
exports.default = gulp.series(clean, tsCompile, lib, test);
