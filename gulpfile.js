'use strict';

const gulp = require('gulp');
const browserify = require('browserify');
const transform = require('vinyl-source-stream');

gulp.task('browserify', () => 
  browserify('xible/index.js', {
    standalone: 'Xible'
  })
  .bundle()
  .pipe(transform('xible.js'))
  .pipe(gulp.dest('./dist'))
);

gulp.task('start', ['browserify'], () => {
  gulp.watch(['xible/*.js'], ['browserify']);
});
