const autoPrefixer = require('gulp-autoprefixer');

let project_folder = require("path").basename(__dirname); //сюда собирается проект
let source_folder = "#src"; //папка с исходниками

let fs = require('fs');


//пути куда gulp будет выгружать обработанные файлы

let path = {
    build: {
        html: project_folder + "/",
        css: project_folder + "/css",
        js: project_folder + "/js",
        img: project_folder + "/img",
        fonts: project_folder + "/fonts",
        // удалить
        fancybox: project_folder + "/fancybox",
    },

    src: {
        html: [source_folder + "/*.html", "!" + source_folder + "/_*.html"],
        css: source_folder + "/scss/style.scss",
        js: source_folder + "/js/script.js",
        img: source_folder + "/img/**/*.{jpg,png,gif,ico,webp}", // слушаем все подпапки, которые находятся в img, но смотрим только на файлы с любым названием, но конкретным расширением
        fonts: source_folder + "/fonts/*.ttf",
        // удалить
        fancybox: source_folder + "/fancybox/*",
    },

    //пути к файлам, которые нужно слушать постоянно

    watch: {
        html: source_folder + "/**/*.html",
        css: source_folder + "/scss/**/*.scss",
        js: source_folder + "/js/**/*.js",
        img: source_folder + "/img/**/*.{jpg,png,gif,ico,webp}",
    },

    //путь к папке проекта, отвечает за удаление папки проекта каждый раз когда мы запускаем gulp

    clean: "./" + project_folder + "/"
}
//плагины
let {
    src,
    dest
} = require('gulp'),
    gulp = require('gulp'),
    browsersync = require("browser-sync").create(),
    fileinclude = require("gulp-file-include"),
    del = require("del"),
    scss = require("gulp-sass"),
    autoprefixer = require("gulp-autoprefixer"),
    group_media = require("gulp-group-css-media-queries"),
    clean_css = require("gulp-clean-css"),
    rename = require("gulp-rename"),
    uglify = require("gulp-uglify-es").default,
    imagemin = require("gulp-imagemin"),
    webp = require("gulp-webp"),
    webphtml = require("gulp-webp-html"),
    webpcss = require("gulp-webpcss"),
    svgSprite = require("gulp-svg-sprite"),
    ttf2woff = require("gulp-ttf2woff"),
    ttf2woff2 = require("gulp-ttf2woff2"),
    fonter = require("gulp-fonter");


//настройка плагина
function browserSync(params) {
    browsersync.init({
        server: {
            baseDir: "./" + project_folder + "/"
        },
        port: 3000,
        notify: false

    })
}

function html() {
    return src(path.src.html)
        .pipe(fileinclude())
        .pipe(webphtml())
        .pipe(dest(path.build.html))
        .pipe(browsersync.stream())

}

function css() {
    return src(path.src.css)
        .pipe(
            scss({
                outputStyle: "expanded"
            })
        )
        .pipe(
            group_media()

        )
        .pipe(
            autoprefixer({
                overrideBrowserslist: ["last 5 version"],
                cascade: true
            })
        )
        .pipe(webpcss({}))
        .pipe(dest(path.build.css)) //выгрузка перед сжатием

        .pipe(clean_css())
        .pipe(
            rename({
                extname: ".min.css"
            })
        )
        .pipe(dest(path.build.css)) //выгрузка после сжатия css-файла
        .pipe(browsersync.stream())
}

function js() {
    return src(path.src.js)
        .pipe(fileinclude())
        .pipe(dest(path.build.js))
        .pipe(
            uglify()
        )
        .pipe(
            rename({
                extname: ".min.js"
            })
        )
        .pipe(dest(path.build.js))
        .pipe(browsersync.stream())

}

function images() {
    return src(path.src.img)
        .pipe(
            webp({
                quality: 70
            })
        )
        .pipe(dest(path.build.img))
        .pipe(src(path.src.img))
        .pipe(
            imagemin({
                progressive: true,
                svgoPlugins: [{
                    removeViewBox: false
                }],
                interlaced: true,
                optimizationLexel: 3 // 0 to 7 как сильно мы хотим сжимать изображение
            })
        )
        .pipe(dest(path.build.img))
        .pipe(browsersync.stream())

}

function fonts() {
    src(path.src.fonts)
        .pipe(ttf2woff())
        .pipe(dest(path.build.fonts));
    return src(path.src.fonts)
        .pipe(ttf2woff2())
        .pipe(dest(path.build.fonts))
}

function fancybox() {
    return src(path.src.fancybox)
        .pipe(dest(path.build.fancybox))
        .pipe(dest(path.build.fancybox))
        .pipe(browsersync.stream())
}


gulp.task('otf2ttf', function () {
    return src([source_folder + '/fonts/*.otf'])
        .pipe(fonter({
            formats: ['ttf']
        }))
        .pipe(dest(source_folder + '/fonts/'));
})


gulp.task('svgSprite', function () {
    return gulp.src([source_folder + '/iconsprite/*.svg']) //получаем исходники - иконки
        .pipe(svgSprite({
            mode: {
                stack: {
                    sprite: "../icons/icons.svg", //sprite file name
                    //example: true
                }
            },
        }))
        .pipe(dest(path.build.img))
})

function fontsStyle(params) {
    let file_content = fs.readFileSync(source_folder + '/scss/fonts.scss');
    if (file_content == '') {
        fs.writeFile(source_folder + '/scss/fonts.scss', '', cb);
        return fs.readdir(path.build.fonts, function (err, items) {
            if (items) {
                let c_fontname;
                for (var i = 0; i < items.length; i++) {
                    let fontname = items[i].split('.');
                    fontname = fontname[0];
                    if (c_fontname != fontname) {
                        fs.appendFile(source_folder + '/scss/fonts.scss', '@include font("' + fontname + '", "' + fontname + '", "400", "normal");\r\n', cb);
                    }
                    c_fontname = fontname;
                }
            }
        })
    }
}
function cb() { }

function watchFiles(params) {
    gulp.watch([path.watch.html], html);
    gulp.watch([path.watch.css], css);
    gulp.watch([path.watch.js], js);
    gulp.watch([path.watch.img], images);
}

function clean(params) {
    return del(path.clean);
}

let build = gulp.series(clean, gulp.parallel(js, css, html, images, fonts, fancybox), fontsStyle);
let watch = gulp.parallel(build, watchFiles, browserSync);

//заставляем gulp подружиться с переменными


exports.fontsStyle = fontsStyle;
exports.fonts = fonts;
exports.images = images;
exports.js = js;
exports.css = css;
exports.html = html;
exports.build = build;
exports.watch = watch;
exports.default = watch;
exports.fancybox = fancybox;