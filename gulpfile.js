/* jshint node: true */

// generated on 2017-10-12 using generator-webapp 3.0.1
const fs = require("fs");
const process = require("process");
const gulp = require("gulp");
const gulpLoadPlugins = require("gulp-load-plugins");
const browserSync = require("browser-sync")
	.create();
const del = require("del");
const wiredep = require("wiredep").stream;
const runSequence = require("run-sequence");

const gp = gulpLoadPlugins();
const reload = browserSync.reload;

const threeVersion = "88";

let dev = true;

const revision = require("child_process").execSync("git rev-parse HEAD")
	.toString().trim();

const versionInfo = {
	buildID: process.env.TRAVIS_BUILD_ID || "local",
	buildNumber: process.env.TRAVIS_BUILD_NUMBER || "local",
	branch: process.env.TRAVIS_BRANCH || "local",
	tag: process.env.TRAVIS_TAG || "local",
	hash: revision,
	now: new Date()
};

gulp.task("styles", () =>
{
	return gulp.src("app/styles/*.scss")
		.pipe(gp.plumber())
		.pipe(gp.if(dev, gp.sourcemaps.init()))
		.pipe(gp.sass.sync({
			outputStyle: "expanded", precision: 10, includePaths: ["."]
		})
			.on("error", gp.sass.logError))
		.pipe(gp.autoprefixer({
			browsers: [
				"> 1%", "last 2 versions", "Firefox ESR"
			]
		}))
		.pipe(gp.if(dev, gp.sourcemaps.write()))
		.pipe(gulp.dest(".tmp/styles"))
		.pipe(reload({stream: true}));
});

gulp.task("scripts", () =>
{
	return gulp.src("app/scripts/**/*.js")
		.pipe(gp.plumber())
		.pipe(gp.if(dev, gp.sourcemaps.init()))
		.pipe(gp.babel())
		.pipe(gp.if(dev, gp.sourcemaps.write(".")))
		.pipe(gulp.dest(".tmp/scripts"))
		.pipe(reload({stream: true}));
});

gulp.task("dump_scripts", ["scripts"], () =>
{
	return gulp.src(".tmp/scripts/**/*.js")
		.pipe(gulp.dest("dist/scripts"));
});

function lint(files)
{
	return gulp.src(files)
		.pipe(gp.eslint({fix: true}))
		.pipe(reload({stream: true, once: true}))
		.pipe(gp.eslint.format())
		.pipe(gp.if(!browserSync.active, gp.eslint.failAfterError()));
}

gulp.task("lint", () =>
{
	return lint("app/scripts/**/*.js")
		.pipe(gulp.dest("app/scripts"));
});
gulp.task("lint:test", () =>
{
	return lint("test/spec/**/*.js")
		.pipe(gulp.dest("test/spec"));
});

gulp.task("html", ["styles", "scripts"], () =>
{
	const threeLoc = dev ?
		"bower_components/three.js/build/three.min.js" :
		`https://cdnjs.cloudflare.com/ajax/libs/three.js/${threeVersion}/three.min.js`;

	return gulp.src("app/*.html")
		.pipe(gp.useref({searchPath: [".tmp", "app", "."]}))
		.pipe(gp.if(/\.css$/, gp.cssnano({safe: true, autoprefixer: false})))
		.pipe(gp.if(/\.html$/, gp.template({threeLoc: threeLoc})))
		.pipe(gp.if(/\.html$/, gp.htmlmin({
			collapseWhitespace: true,
			minifyCSS: true,
			useShortDoctype: true,
			processConditionalComments: true,
			removeComments: true,
			removeEmptyAttributes: true,
			removeScriptTypeAttributes: true,
			removeStyleLinkTypeAttributes: true
		})))
		.pipe(gp.if(dev, gulp.dest(".tmp"), gulp.dest("dist")));
});

gulp.task("images", () =>
{
	return gulp.src("app/images/**/*")
		.pipe(gp.cache(gp.imagemin()))
		.pipe(gulp.dest("dist/images"));
});

gulp.task("fonts", () =>
{
	return gulp.src(require("main-bower-files")(
		"**/*.{eot,svg,ttf,woff,woff2}",
		function(err)
		{
		})
		.concat("app/fonts/**/*"))
		.pipe(gp.if(dev, gulp.dest(".tmp/fonts"), gulp.dest("dist/fonts")));
});

gulp.task("extras", () =>
{
	return gulp.src([
		"app/*", "!app/*.html"
	], {
		dot: true
	})
		.pipe(gulp.dest("dist"));
});

gulp.task("clean", del.bind(null, [".tmp", "dist"]));

gulp.task("serve", () =>
{
	runSequence(["clean", "wiredep"], ["version", "html", "fonts"], () =>
	{
		browserSync.init({
			notify: false, port: 9000, server: {
				baseDir: [".tmp", "app"], routes: {
					"/bower_components": "bower_components"
				}
			}
		});

		gulp.watch([
			"app/*.html", "app/images/**/*", ".tmp/fonts/**/*"
		])
			.on("change", reload);

		gulp.watch("app/styles/**/*.scss", ["styles"]);
		gulp.watch("app/scripts/**/*.js", ["scripts"]);
		gulp.watch("app/fonts/**/*", ["fonts"]);
		gulp.watch("bower.json", ["wiredep", "fonts"]);
	});
});

gulp.task("serve:dist", ["default"], () =>
{
	browserSync.init({
		notify: false, port: 9000, server: {
			baseDir: ["dist"]
		}
	});
});

gulp.task("serve:test", ["scripts"], () =>
{
	browserSync.init({
		notify: false, port: 9000, ui: false, server: {
			baseDir: "test", routes: {
				"/scripts": ".tmp/scripts", "/bower_components": "bower_components"
			}
		}
	});

	gulp.watch("app/scripts/**/*.js", ["scripts"]);
	gulp.watch(["test/spec/**/*.js", "test/index.html"])
		.on("change", reload);
	gulp.watch("test/spec/**/*.js", ["lint:test"]);
});

// inject bower components
gulp.task("wiredep", () =>
{
	gulp.src("app/styles/*.scss")
		.pipe(gp.filter(file => file.stat && file.stat.size))
		.pipe(wiredep({
			ignorePath: /^(\.\.\/)+/
		}))
		.pipe(gulp.dest("app/styles"));

	gulp.src("app/*.html")
		.pipe(wiredep({
			ignorePath: /^(\.\.\/)*\.\./
		}))
		.pipe(gulp.dest("app"));
});

gulp.task("version", () =>
{
	const contents = `export default ${JSON.stringify(versionInfo)};\n`;
	const loc = dev ? ".tmp/scripts" : "dist/scripts";
	return gp.file("build_info.js", contents, {src: true}).pipe(gulp.dest(loc));
});

gulp.task("build",
	["version", "lint", "html", "images", "fonts", "extras", "dump_scripts"],
	() =>
	{
		return gulp.src("dist/**/*")
			.pipe(gp.size({title: "build", gzip: true}));
	});

gulp.task("default", () =>
{
	return new Promise(resolve =>
	{
		dev = false;
		runSequence(["clean", "wiredep"], "build", resolve);
	});
});
