// enable source map support in node stack traces
require("source-map-support").install();

var gulp = require('gulp');
var sourcemaps = require('gulp-sourcemaps');
var ts = require('gulp-typescript');
var babel = require('gulp-babel');
var del = require('del')
var mocha = require("gulp-mocha");
var merge = require("merge2");
var dts = require("dts-concat");

var tsProject = ts.createProject('./tsconfig.json', {
    typescript: require("typescript")
});

gulp.task('clean', function() {
    // You can use multiple globbing patterns as you would with `gulp.src`
    return del(['build', 'lib']);
});

gulp.task('copy-dts', function() {
    return gulp.src(['typings/**/*.d.ts', 'src/**/*.d.ts' ], { base: './' })
        .pipe(gulp.dest('build'));
});

gulp.task('build', ['clean'], function() {

    var tsResult = gulp.src(['typings/**/*.ts', 'src/**/*.ts', 'tests/**/*.ts'])
        .pipe(sourcemaps.init())
        .pipe(ts(tsProject));

    return merge([
        tsResult.dts.pipe(gulp.dest('build')),
        tsResult.js.pipe(babel({
            presets: [ 'babel-preset-node5' ],
            plugins: [ "transform-es2015-classes" ]
        }))
        .pipe(sourcemaps.write('.', {includeContent: false, sourceRoot: process.cwd() }))
        .pipe(gulp.dest('build'))
    ]);
});

gulp.task('test', function() {
    return gulp.src('build/tests/**/*.tests.js', {read: false})
        .pipe(mocha());
});

gulp.task('lib', ['copy-dts'], function(done) {

    var stream = gulp.src(['build/src/**/*.js' ])
        .pipe(gulp.dest('lib'));

    stream.on('end', function() {
        dts.concat({
            name: 'hydrate',
            main: 'build/src/hydrate.d.ts',
            outDir: 'lib/'
        }, done);
    });
});

// TODO: strip source map comment when creating lib