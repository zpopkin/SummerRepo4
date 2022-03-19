library(shiny)
install.packages("shinyWidgets")
library(shinyWidgets)

# uniform color change in the background

ui <- fluidPage(
  tags$h2("Change shiny app background"),
  setBackgroundColor("pink")
)

server <- function(input, output, session) {
  
}

shinyApp(ui, server)





ui <- fluidPage(
  
  # use a gradient in background
  setBackgroundColor(
    color = c("white", "red"),
    gradient = "linear",
    direction = "bottom"
  ),
  
  titlePanel("Hello Shiny!"),
  sidebarLayout(
    sidebarPanel(
      sliderInput("obs",
                  "Number of observations:",
                  min = 0,
                  max = 1000,
                  value = 500)
    ),
    mainPanel(
      plotOutput("distPlot")
    )
  )
)

server <- function(input, output, session) {
  output$distPlot <- renderPlot({
    hist(rnorm(input$obs))
  })
}

shinyApp(ui, server)





### radial gradient background :

library(shiny)
library(shinyWidgets)

ui <- fluidPage(
  
  # use a gradient in background
  setBackgroundColor(
    color = c("#F7FBFF", "#2171B5"),
    gradient = "radial",
    direction = c("top", "left")
  ),
  
  titlePanel("Hello Shiny!"),
  sidebarLayout(
    sidebarPanel(
      sliderInput("obs",
                  "Number of observations:",
                  min = 0,
                  max = 1000,
                  value = 500)
    ),
    mainPanel(
      plotOutput("distPlot")
    )
  )
)

server <- function(input, output, session) {
  output$distPlot <- renderPlot({
    hist(rnorm(input$obs))
  })
}

shinyApp(ui, server)


q()
y

