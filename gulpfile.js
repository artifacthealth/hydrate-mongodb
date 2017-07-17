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

gulp.task('default', function(done) {

    runSequence('build', 'lib', 'test', done);
});

// Performs build without sourcemaps but includes dts files
gulp.task('build', ['clean'], function() {

    var tsResult = gulp.src(['typings/**/*.ts', 'src/**/*.ts', 'tests/**/*.ts', 'benchmarks/**/*.ts'], { base: process.cwd() })
        .pipe(tsProject());

    return merge([
        tsResult.dts.pipe(gulp.dest('build')),
        tsResult.js.pipe(gulp.dest('build'))
    ]);
});

// Performs build with sourcemaps
gulp.task('debug', ['clean'], function() {

    return gulp.src(['typings/**/*.ts', 'src/**/*.ts', 'tests/**/*.ts', 'benchmarks/**/*.ts'], { base: process.cwd() })
        .pipe(sourcemaps.init())
        .pipe(tsProject())
        .pipe(sourcemaps.write('.', {includeContent: false, sourceRoot: process.cwd() }))
        .pipe(gulp.dest('build'));
});



gulp.task('clean', function() {
    return del(['build', 'lib']);
});

gulp.task('lib', function(done) {

    return gulp.src(['build/src/**/*.js', "build/src/**/*.d.ts", "src/**/*.d.ts", "package.json", "*.txt", "*.md" ])
        .pipe(gulp.dest('lib'));
});

gulp.task('test', function() {
    return gulp.src('build/tests/**/*.tests.js', {read: false})
        .pipe(mocha());
});

gulp.task('bench', function(done) {

    var baseline = new Baseline();
    baseline.reporter = new Baseline.DefaultReporter();
    baseline.useColors = true;
    baseline.baselinePath = "baseline.json";
    baseline.files = [ "build/benchmarks/sessionImpl.bench.js" ];
    baseline.run(function(err, slower) {
        done(err);
        process.exit(slower);
    });
});

gulp.task('docs', function() {
    return gulp.src(['typings/**/*.ts', 'src/**/*.ts']).pipe(typedoc({
        target: 'es6',
        module: "commonjs",
        out: 'build/docs',
        mode: "file",
        name: "hydrate-mongodb",
        entryPoint: "index",
        umlFormat: "svg",
        includeDeclarations: false,
        excludeExternals: true,
        excludeNotExported: true
    }));
});

gulp.task('release-docs', function(done) {

    return gulp.src(['build/docs/**/*.*' ])
        .pipe(gulp.dest('docs'));
});

gulp.task('pre-coverage', function () {
    return gulp.src(['build/src/**/*.js'])
        // Covering files
        .pipe(istanbul())
        // Force `require` to return covered files
        .pipe(istanbul.hookRequire());
});

gulp.task('coverage', ['pre-coverage'], function () {
    return gulp.src(['build/tests/**/*.tests.js'])
        .pipe(mocha())
        // Creating the reports after tests ran
        .pipe(istanbul.writeReports("build/coverage"))
        // Enforce a coverage of at least 90%
        .pipe(istanbul.enforceThresholds({ thresholds: { global: 90 } }));
});
