

library(shiny)

# Examples of basic siny apps

runExample("01_hello")      # a histogram

runExample("02_text")       # tables and data frames

runExample("04_mpg")        # global variables



library(shiny)
ui <- fluidPage(sliderInput(inputId = "num",
                            label = "Choose a number",
                            value = 25, min = 1, max = 100),
                plotOutput("hist")
)
server <- function(input, output) {
  output$hist <-renderPlot({
    title <- "Random Normal Values"
    hist(rnorm(input$num), main = title)
  })
}
shinyApp(ui = ui, server = server)

# modified app

library(shiny)
ui <- fluidPage(sliderInput(inputId = "num",
                            label = "Choose a number",
                            value = 25, min = 1, max = 100),
                plotOutput("hist")
)
server <- function(input, output) {
  output$hist <-renderPlot({
    title <- "Random Normal Values"
    hist(rnorm(input$num),col = "#75AADB", border = "white",
         main = title)
  })
}
shinyApp(ui = ui, server = server)
