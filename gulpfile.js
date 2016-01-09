// enable source map support in node stack traces
require("source-map-support").install();

var gulp = require('gulp');
var sourcemaps = require('gulp-sourcemaps');
var ts = require('gulp-typescript');
var babel = require('gulp-babel');
var del = require('del')
var mocha = require("gulp-mocha");

var tsProject = ts.createProject('./tsconfig.json', {
    typescript: require("typescript")
});

gulp.task('clean', function() {
    // You can use multiple globbing patterns as you would with `gulp.src`
    return del(['build']);
});

gulp.task('build', ['clean'], function() {
    return gulp.src(['typings/**/*.ts', 'src/**/*.ts', 'tests/**/*.ts'])
        .pipe(sourcemaps.init())
        .pipe(ts(tsProject))
        .pipe(babel({
            presets: [ 'babel-preset-node5' ],
            plugins: [ "transform-es2015-classes" ]
        }))
        .pipe(sourcemaps.write('.', {includeContent: false, sourceRoot: process.cwd() }))
        .pipe(gulp.dest('build'));
});

gulp.task('test', function() {
    return gulp.src('build/tests/**/*.tests.js', {read: false})
        // gulp-mocha needs filepaths so you can't have any plugins before it
        .pipe(mocha());
});

