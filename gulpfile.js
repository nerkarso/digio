const babel = require('gulp-babel');
const cleanCss = require('gulp-clean-css');
const concat = require('gulp-concat');
const del = require('del');
const gulp = require('gulp');
const rename = require('gulp-rename');
const sass = require('gulp-sass')(require('sass'));
const uglify = require('gulp-uglify');

const filesToCopy = ['src/*.*', 'src/img/**/*'];

function processCss() {
  return gulp
    .src('src/scss/*.scss')
    .pipe(
      sass({
        outputStyle: 'nested',
        precision: 10,
        includePaths: ['.'],
      })
    )
    .pipe(cleanCss())
    .pipe(
      rename({
        suffix: '.min',
      })
    )
    .pipe(gulp.dest('dist/css'));
}

function processJs() {
  return (
    gulp
      // .src(['src/js/sw.js', 'src/js/app.js'])
      .src(['src/js/utils.js', 'src/js/app.js'])
      .pipe(
        babel({
          presets: ['@babel/preset-env'],
        })
      )
      .pipe(uglify())
      .pipe(concat('main.min.js'))
      .pipe(gulp.dest('dist/js'))
  );
}

function clean() {
  return del(['dist']);
}

function copy() {
  return gulp.src(filesToCopy, { base: 'src', encoding: false }).pipe(gulp.dest('dist'));
}

function watching(cb) {
  gulp.watch(filesToCopy, copy);
  gulp.watch('src/scss/*.scss', processCss);
  gulp.watch('src/js/*.js', processJs);
  cb();
}

const destDir = '';

function cleanDir() {
  return del([destDir + '/**/*'], {
    force: true,
  });
}

function uploadDir() {
  return gulp.src('dist/**/*').pipe(gulp.dest(destDir));
}

exports.watch = gulp.series(clean, copy, gulp.parallel(processCss, processJs), watching);
exports.build = gulp.series(clean, copy, gulp.parallel(processCss, processJs));
exports.upload = gulp.series(cleanDir, uploadDir);
