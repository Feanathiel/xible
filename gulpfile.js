'use strict';

const gulp = require('gulp');
const browserify = require('browserify');
const transform = require('vinyl-source-stream');
const jasmine = require('gulp-jasmine');

gulp.task('browserify', () => 
  browserify('xible/Xible.js', {
    standalone: 'Xible',
    debug: true
  })
  .bundle()
  .pipe(transform('xible.js'))
  .pipe(gulp.dest('./dist'))
);

gulp.task('start', ['browserify'], () => {
  gulp.watch(['xible/*.js'], ['browserify']);
});

gulp.task('test', () => {
  return gulp.src('test/xible.test.js')
    .pipe(jasmine({
      verbose: true
    }))
});

gulp.task('test:watch', ['test'], () => {
  gulp.watch([
    'xible/*.js',
    'test/*.js'
  ],
  ['test']);
});
