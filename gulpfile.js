var gulp = require('gulp');

var mainBowerFiles = require('main-bower-files');
var webserver = require('gulp-webserver');
var merge = require('merge-stream');
var concat = require('gulp-concat');
var filter = require('gulp-filter');
var uglify = require('gulp-uglify');
var rename = require('gulp-rename');
var order = require('gulp-order');
var angularTemplates = require('gulp-angular-templates');

var palladioSources = [
	"./lib/crossfilter/crossfilter-helpers.js",
	"./lib/bootstrap-tag/bootstrap-tag.js",
	"./lib/d3/d3.timeline.js",
	"./lib/d3/d3.graph.js",
	"./lib/d3/d3.svg.multibrush.js",
	"./lib/d3-bootstrap/d3-bootstrap-plugins.js",
	"./lib/codemirror/placeholder.js",
	// "./lib/yasqe/yasqe.min.js",
	// "./lib/yasr/yasr.min.js",
	"./src/js/**/*.js",
	"./src/components/**/*.js",
	"./src/unfinished_components/**/*.js"
];
var palladioCSS = [ "./lib/**/*.css", "./src/**/*.css" ];
var palladioTemplate = [
	"./src/html/*.html",
	// "./src/unfinished_components/**/*.html",
	"./src/components/**/*.html"
];

var filterByExtension = function(extension){
    return filter(function(file){
        return file.path.match(new RegExp('.' + extension + '$'));
    });
};

gulp.task('scripts', function () {
	var files = gulp.src(
			mainBowerFiles()
				.concat(palladioSources)
		)
		.pipe(filterByExtension("js"))
		.pipe(concat('jsFiles.js'));

	var templates = gulp.src(palladioTemplate)
		.pipe(angularTemplates({ module: 'palladio', basePath: 'partials/' }))
		.pipe(rename('templates.tmpl'));

	merge(files, templates)
		.pipe(order(['*.js', '*.tmpl']))
        .pipe(concat('palladio.js'))
        .pipe(gulp.dest('./'))
        .pipe(gulp.dest('./apps/palladio/'))
        .pipe(gulp.dest('./apps/standalone/'))
        .pipe(gulp.dest('./apps/timespans/'))
        .pipe(gulp.dest('./apps/template/'));

        
        // .pipe(rename('palladio.min.js'))
        // .pipe(uglify())
        // .pipe(gulp.dest('./'))
        // .pipe(gulp.dest('./apps/palladio/'))
        // .pipe(gulp.dest('./apps/timespans/'));
});

gulp.task('css', function () {
	gulp.src(mainBowerFiles()
				.concat(palladioCSS))
		.pipe(filterByExtension("css"))
		.pipe(concat('palladio.css'))
		.pipe(gulp.dest('./'))
        .pipe(gulp.dest('./apps/palladio/'))
        .pipe(gulp.dest('./apps/standalone/'))
        .pipe(gulp.dest('./apps/timespans/'))
        .pipe(gulp.dest('./apps/template/'));
});

// Watch Files For Changes
gulp.task('watch', function() {
	gulp.watch(["bower.json"], ['scripts', 'css']);
    gulp.watch(palladioSources, ['scripts']);
    gulp.watch(palladioCSS, ['css']);
    gulp.watch(palladioTemplate, ['scripts']);
});

gulp.task('webserver-palladio', function() {
	gulp.src('apps/palladio')
	// gulp.src('apps/standalone')
		.pipe(webserver({
			livereload: true,
			port: 8000
		}));
});

gulp.task('default', ['scripts', 'css', 'webserver-palladio', 'watch']);
gulp.task('all', ['scripts', 'css']);
gulp.task('serve', ['webserver-palladio'])