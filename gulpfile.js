const gulp = require('gulp'),
    sass = require('gulp-sass'),
    livereload = require('gulp-livereload'),
    csso = require('gulp-csso'),
    rename = require('gulp-rename'),
    uglify = require('gulp-uglify'),
    conct = require('gulp-concat'),
    sourcemaps = require('gulp-sourcemaps'),
    gutil = require('gulp-util'),
    runSequence = require('run-sequence'),
    flatten = require('gulp-flatten'),
    wrap = require('gulp-wrap'),
    addsrc = require('gulp-add-src'),
    imagemin = require('gulp-imagemin'),
    spritesmith = require('gulp.spritesmith'),
    babel = require('gulp-babel'),
    ngAnnotate = require('gulp-ng-annotate'),
    templateCache = require('gulp-angular-templatecache'),
    htmlmin = require('gulp-htmlmin'),
    autoprefixer = require('gulp-autoprefixer'),
    serve = require('gulp-serve');

const outputAppDirectory = 'static',
    npmDirectory = 'node_modules',
    sourceDirectory = 'source';



const fullExtJsSrces = [
    '/jquery/dist/jquery.min.js',
    '/masonry-layout/dist/masonry.pkgd.min.js',
    '/imagesloaded/imagesloaded.pkgd.min.js',
    '/angular/angular.js',
    '/angular-masonry/angular-masonry.js',
    '/angular-animate/angular-animate.js',
    '/angular-messages/angular-messages.js',
    '/angular-ui-router/release/angular-ui-router.min.js',
    '/angular-ui-bootstrap/dist/ui-bootstrap-tpls.js',
    '/angularjs-slider/dist/rzslider.min.js',
    '/satellizer/dist/satellizer.min.js',
    '/ng-file-upload/dist/ng-file-upload-all.min.js',
    '/ng-tags-input/build/ng-tags-input.min.js',
    '/restangular/dist/restangular.min.js'
].map(function (src) {
    return npmDirectory + src;
}).concat([
    'custom-modules/angular-swipe/dist/angular-swipe.min.js',
    'custom-modules/angular-carousel-3d/dist/carousel-3d.min.js',
    'custom-modules/angular-masonry-directive/src/angular-masonry-directive.js',
]);

const fullExtPriorityJsSrces = [
    '/',
].map(function (src) {
    return npmDirectory + src;
});

const fullExtCssSrces = [
    'custom-modules/custom-bootstrap/bootstrap.css',
    'custom-modules/html5-boilerplate/dist/css/normalize.css',
    'custom-modules/html5-boilerplate/dist/css/main.css',
    'custom-modules/font-awesome/font-awesome.min.css',
].concat([
        '/angularjs-slider/dist/rzslider.min.css',
        '/ng-tags-input/build/ng-tags-input.min.css'
    ].map(function (src) {
        return npmDirectory + src;
    }).concat([
        'custom-modules/angular-carousel-3d/dist/carousel-3d.min.css',
    ])
);

//Task for concat js libraries which must be loaded first
gulp.task('priority-ext-js', function () {
    const jsOutputDirectory = outputAppDirectory + '/js';
    gulp.src(fullExtPriorityJsSrces)
        .pipe(conct('priority.js'))
        // .pipe(uglify())
        .pipe(gulp.dest(jsOutputDirectory));
});

//Task for concat js libraries which are loaded first
gulp.task('ext-js', function () {
    const jsOutputDirectory = outputAppDirectory + '/js';
    
    return gulp.src(fullExtJsSrces)
        // .pipe(sourcemaps.init())
        .pipe(conct('externals.js'))
        // .pipe(uglify())
        // .pipe(sourcemaps.write('.'))
        .pipe(gulp.dest(jsOutputDirectory));
});


//Task for compressing and optimizing images
gulp.task('compress-images', function () {
    const imagesInputDirectory = sourceDirectory + '/static/img';
    const imagesOutputDirectory = outputAppDirectory + '/img';
    
    return gulp.src([
            imagesInputDirectory + '/**/*.*',
            '!' + imagesInputDirectory + '/icons/*.*',
            '!' + imagesInputDirectory + '/svg/*.*'
        ])
        .pipe(imagemin({verbose: true}))
        .pipe(gulp.dest(imagesOutputDirectory));
});


//Task for compile SCSS files, to concat with externals css and to optimize and minify
gulp.task('make-css', function () {
    const scssInputDirectory = sourceDirectory + '/scss-entry';
    const cssOutputDirectory = outputAppDirectory + '/css';
    const includePaths = require("bourbon").includePaths.concat(
        require("bourbon-neat").includePaths
    );
    return gulp.src(scssInputDirectory + '/app.scss')
        // .pipe(sourcemaps.init())
        .pipe(sass({includePaths: includePaths}).on('error', sass.logError))
        .pipe(autoprefixer({
            browsers: ['last 2 versions'],
            cascade: false
        }))
        .pipe(addsrc.prepend(fullExtCssSrces))
        .pipe(conct('app.css'))
        // .pipe(csso())
        // .pipe(sourcemaps.write('.'))
        .pipe(gulp.dest(cssOutputDirectory));
});

//Task for run all tasks
gulp.task('default', function () {
    return runSequence(
        'make-css',
        'compile-html-templates',
        'make-js',
        'ext-js',
        'priority-ext-js',
        'compress-images',
        'sprites',
        'watch'
    );
});

//Task for concat sprites into one file with scss file
gulp.task('sprites', function () {
    const spritesInputDirectory = sourceDirectory + '/static/img/icons';
    const spriteOutputDirectory = outputAppDirectory + '/img';
    
    return gulp.src(spritesInputDirectory + '/**/*.*')
        .pipe(spritesmith({
            imgName: 'sprites.png',
            cssName: '../../' + sourceDirectory + '/scss-entry/_sprites.scss',
            imgPath: '../img/sprites.png',
            cssVarMap: function (sprite) {
                sprite.name = 'ic--' + sprite.name;
            }
        }))
        .pipe(gulp.dest(spriteOutputDirectory));
});

//Task for concat all internal js files
gulp.task('make-js', function () {
    const jsInputDirectory = sourceDirectory;
    const jsOutputDirectory = outputAppDirectory + '/js';
    
    return gulp.src([
            jsInputDirectory + '/app.ng.js',
            jsInputDirectory + '/templates.ng.js',
            jsInputDirectory + '/**/*.js'
        ], {base: 'source'})
        .pipe(sourcemaps.init())
        .pipe(babel({
            presets: ['es2015']
        }))
        .pipe(conct('app.js'))
        .pipe(ngAnnotate())
        .pipe(sourcemaps.write('./'))
        // .pipe(uglify())
        .pipe(gulp.dest(jsOutputDirectory));
});


//Task for concat all html templates and compile to js with wrap to $templateCache
gulp.task('compile-html-templates', function () {
    
    const htmlInputDirectory = sourceDirectory;
    const concatTemplatesJsDirectory = sourceDirectory;
    
    return gulp.src(htmlInputDirectory + '/**/*.html')
        .pipe(htmlmin({collapseWhitespace: true}))
        .pipe(templateCache
        (
            "templates.ng.js",
            {
                module: 'rootApp',
                templateHeader: 'angular.module("<%= module %>"<%= standalone %>).run(["$templateCache", function($templateCache) {',
                transformUrl: function (url) {
                    return url;
                }
            }
        ))
        .pipe(gulp.dest(concatTemplatesJsDirectory));
});

//Task for livereload when css / js / html files are changed
gulp.task('watch', function () {
    livereload.listen();
    gulp.watch([sourceDirectory + '/**/*.scss'], ['make-css']);
    gulp.watch([sourceDirectory + '/**/*.html'], ['compile-html-templates']);
    gulp.watch([sourceDirectory + '/**/*.js'], ['make-js']);
    gulp.watch([sourceDirectory + '/static/img/**/*.*'], ['compress-images']);
    //Livereload watch
    gulp.watch([
        outputAppDirectory + '/css/**/*.css',
        outputAppDirectory + '/js/**/*.js',
        outputAppDirectory + '/img/**/*.*',
        'index.html'
    ]).on('change', livereload.changed);
});



