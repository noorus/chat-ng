require "zurb-foundation"

project_type = :stand_alone
environment = :production

http_path = "/"
css_dir = "theme"
sass_dir = "sass"
images_dir = "img"
javascripts_dir = "js/lib"

output_style = (environment == :production) ? :compressed : :expanded

relative_assets = true

line_comments = false