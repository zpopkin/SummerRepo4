
library(tidyverse)
library(shiny)
install.packages("datasets")

# Building a user interface /Layout Components

ui <- fluidPage(
  titlePanel("title panel"),
  
  sidebarLayout(
    sidebarPanel("sidebar panel"),
    mainPanel("main panel")
  )
)

# titlePanel and sidebarLayout are the two most popular elements 
# to add to fluidPage. They create a basic Shiny app with a sidebar.

# sidebarLayout always takes two arguments:
  
# sidebarPanel function output

# mainPanel function output

# These functions place content in either the sidebar or the main 
#panels.

# The sidebar panel will appear on the left side of your app by 
# default. You can move it to the right side by giving
# sidebarLayout the optional argument position = "right".

ui <- fluidPage(
  titlePanel("title panel"),
  
  sidebarLayout(position = "right",
                sidebarPanel("sidebar panel"),
                mainPanel("main panel")
  )
)


# To add more advanced content, use one of Shiny's HTML tag 
# functions.

#shiny function 	HTML5 equivalent 	creates
#p 	  <p> 	A paragraph of text
#h1 	<h1> 	A first level header
#h2 	<h2> 	A second level header
#h3 	<h3> 	A third level header
#h4 	<h4> 	A fourth level header
#h5 	<h5> 	A fifth level header
#h6 	<h6> 	A sixth level header
#a 	  <a> 	A hyper link
#br 	<br> 	A line break (e.g. a blank line)
#div 	<div> 	A division of text with a uniform style
#span <span> 	An in-line division of text with a uniform style
#pre 	<pre> 	Text 'as is' in a fixed width font
#code <code> 	A formatted block of code
#img 	<img> 	An image
#strong <strong> 	Bold text
#em 	<em> 	Italicized text
#HTML 	  	Directly passes a character string as HTML code


# Headers


ui <- fluidPage(
  titlePanel("My Shiny App"),
  sidebarLayout(
    sidebarPanel(),
    mainPanel(
      h1("First level title"),
      h2("Second level title"),
      h3("Third level title"),
      h4("Fourth level title"),
      h5("Fifth level title"),
      h6("Sixth level title")
    )
  )
)

server <- function(input, output) {
  
}

shinyApp(ui = ui, server = server)




ui <- fluidPage(
  titlePanel("My Shiny App"),
  sidebarLayout(
    sidebarPanel(),
    mainPanel(
      h1("First level title", align = "center", style = "color:red"),
      h2("Second level title", align = "right", style = "color:blue"),
      h3("Third level title", align = "center"),
      h4("Fourth level title", align = "center"),
      h5("Fifth level title", align = "center"),
      h6("Sixth level title", align = "left")
    )
  )
)

server <- function(input, output) {
  
}

shinyApp(ui = ui, server = server)

# Special Shiny Tags (talk through first)
ui <- fluidPage(
  titlePanel("My Shiny App"),
  sidebarLayout(
    sidebarPanel(),
    mainPanel(
      # p("p creates a paragraph of text."),
      p("It is not a good idea to take too many classes. An
        undrgraduate student should not take more than five
        classes"),
      br(),  #line break
     # p("A new p() command starts a new paragraph"), 
     p("A freshman should probably not work his or her first
       semester of college"),
      br(),
     # strong("strong() makes bold text."),
     strong("A freshman should probably not work his or her first
       semester of college"),
     br(),
     # em("em() creates italicized (i.e, emphasized) text."),
      br(),
     p(em("A freshman should probably not work his or her first
       semester of college")),
     br(),
      #code("code displays your text similar to computer code"),
     p(code("A freshman should probably not work his or her first
       semester of college")),
     br(),
      # div("div creates segments of text with a similar style. 
       #  We can make the text a color other than black by passing 
        # the argument 'style = color:blue' to div",
        # style = "color:blue"),
      p(div("A freshman should probably not work his or her first
       semester of college", style = "color:blue")),
      br(),
      # p("span does the same thing as div, but it works within",
      #  span("groups of words", style = "color:blue"),
      # "that appear inside a paragraph.")
     span("A freshman should probably not work",style = "color:orange"), 
          "his or her first semester of college.")
     
    )
  )



server <- function(input, output) {
  
}

shinyApp(ui = ui, server = server)


# use h2 to increase the font of the first example


# Reactivity shiny app 1 (coding forces output changes for given
# inputs)

ui <- fluidPage(
  titlePanel("Name Greetings"),
  textInput("name", "What's your name?"),
  textOutput("greeting")
)

server <- function(input, output, session) {
  output$greeting <- renderText({
    paste("Hello ", input$name, "!")
  })
}

shinyApp(ui = ui, server = server)





# Reactivity shiny app 2

# Rely on the 'WorldPhones' dataset in the datasets
# package (which generally comes preloaded).
library(datasets)

WorldPhones

# Use a fluid Bootstrap layout
ui <- fluidPage(    
  
  # Give the page a title
  titlePanel("Telephones by region"),
  
  # Generate a row with a sidebar
  sidebarLayout(      
    
    # Define the sidebar with one input
    sidebarPanel(
      selectInput("region", "Region:", 
                  choices=colnames(WorldPhones)),
      #hr(),
      helpText("Data from AT&T (1961) The World's Telephones.")
    ),
    
    # Create a spot for the barplot
    mainPanel(
      plotOutput("phonePlot")  
    )
    
  )
)


# Rely on the 'WorldPhones' dataset in the datasets
# package (which generally comes preloaded).
library(datasets)

# Define a server for the Shiny app
server <- function(input, output) {
  
  # Fill in the spot we created for a plot
  output$phonePlot <- renderPlot({
    
    # Render a barplot
    barplot(WorldPhones[,input$region]*1000, 
            main=input$region,
            ylab="Number of Telephones",
            xlab="Year")
            
            
  })
}

shinyApp(ui = ui, server = server)

#  Another example

# Reactive Shiny App 3
runExample("01_hello")      # a histogram

# Define UI for app that draws a histogram ----
ui <- fluidPage(
  
  # App title ----
  titlePanel("Hello Shiny!"),
  
  # Sidebar layout with input and output definitions ----
  sidebarLayout(
    
    # Sidebar panel for inputs ----
    sidebarPanel(
      
      # Input: Slider for the number of bins ----
      sliderInput(inputId = "bins",
                  label = "Number of bins:",
                  min = 1,
                  max = 50,
                  value = 30)
      
    ),
    
    # Main panel for displaying outputs ----
    mainPanel(
      
      # Output: Histogram ----
      plotOutput(outputId = "distPlot")
      
    )
  )
)

# Define server logic required to draw a histogram ----
server <- function(input, output) {
  
  # Histogram of the Old Faithful Geyser Data ----
  # with requested number of bins
  # This expression that generates a histogram is wrapped in a call
  # to renderPlot to indicate that:
  #
  # 1. It is "reactive" and therefore should be automatically
  #    re-executed when inputs (input$bins) change
  # 2. Its output type is a plot
  output$distPlot <- renderPlot({
    
    x    <- faithful$waiting
    bins <- seq(min(x), max(x), length.out = input$bins + 1)
    
    hist(x, breaks = bins, col = "#75AADB", border = "white",
         xlab = "Waiting time to next eruption (in mins)",
         main = "Histogram of waiting times")
    
  })
  
}

# Create Shiny app ----
shinyApp(ui = ui, server = server)



# Old faithful example
library(shiny)

# Define UI for app that draws a histogram ----
ui <- fluidPage(
  
  # App title ----
  titlePanel("Old Faithful Histogram!"),
  
  # Sidebar layout with input and output definitions ----
  sidebarLayout(
    
    # Sidebar panel for inputs ----
    sidebarPanel(
      
      # Input: Slider for the number of bins ----
      sliderInput(inputId = "bins",
                  label = "Number of bins:",
                  min = 1,
                  max = 50,
                  value = 30)
      
    ),
    
    # Main panel for displaying outputs ----
    mainPanel(
      
      # Output: Histogram ----
      plotOutput(outputId = "distPlot")
      
    )
  )
)

# Define server logic required to draw a histogram ----
server <- function(input, output) {
  
  # Histogram of the Old Faithful Geyser Data ----
  # with requested number of bins
  # This expression that generates a histogram is wrapped in a call
  # to renderPlot to indicate that:
  #
  # 1. It is "reactive" and therefore should be automatically
  #    re-executed when inputs (input$bins) change
  # 2. Its output type is a plot
  output$distPlot <- renderPlot({
    
    x    <- faithful$waiting
    bins <- seq(min(x), max(x), length.out = input$bins + 1)
    
    hist(x, breaks = bins, col = "red", border = "white",
         xlab = "Waiting time to next eruption (in mins)",
         main = "Histogram of waiting times")
    
  })
  
}

# Create Shiny app ----
shinyApp(ui = ui, server = server)

# Reactive Shiny App 4


# Define UI for dataset viewer app ----
ui <- fluidPage(
  
  # App title ----
  titlePanel("Reactivity"),
  
  # Sidebar layout with input and output definitions ----
  sidebarLayout(
    
    # Sidebar panel for inputs ----
    sidebarPanel(
      
      # Input: Text for providing a caption ----
      # Note: Changes made to the caption in the textInput control
      # are updated in the output area immediately as you type
      textInput(inputId = "caption",
                label = "Caption:",
                value = "Data Summary"),
      
      # Input: Selector for choosing dataset ----
      selectInput(inputId = "dataset",
                  label = "Choose a dataset:",
                  choices = c("rock", "pressure", "cars")),
      
      # Input: Numeric entry for number of obs to view ----
      numericInput(inputId = "obs",
                   label = "Number of observations to view:",
                   value = 10)
      
    ),
    
    
    # Main panel for displaying outputs ----
    mainPanel(
      
      # Output: Formatted text for caption ----
      h3(textOutput("caption", container = span)),
      
      # Output: Verbatim text for data summary ----
      verbatimTextOutput("summary"),
      
      # Output: HTML table with requested number of observations ----
      tableOutput("view")
      
    )
  )
)

# Define server logic to summarize and view selected dataset ----
server <- function(input, output) {
  
  # Return the requested dataset ----
  # By declaring datasetInput as a reactive expression we ensure
  # that:
  #
  # 1. It is only called when the inputs it depends on changes
  # 2. The computation and result are shared by all the callers,
  #    i.e. it only executes a single time
  datasetInput <- reactive({
    switch(input$dataset,
           "rock" = rock,
           "pressure" = pressure,
           "cars" = cars)
  })
  
  # Create caption ----
  # The output$caption is computed based on a reactive expression
  # that returns input$caption. When the user changes the
  # "caption" field:
  #
  # 1. This function is automatically called to recompute the output
  # 2. New caption is pushed back to the browser for re-display
  #
  # Note that because the data-oriented reactive expressions
  # below don't depend on input$caption, those expressions are
  # NOT called when input$caption changes
  output$caption <- renderText({
    input$caption
  })
  
  # Generate a summary of the dataset ----
  # The output$summary depends on the datasetInput reactive
  # expression, so will be re-executed whenever datasetInput is
  # invalidated, i.e. whenever the input$dataset changes
  output$summary <- renderPrint({
    dataset <- datasetInput()
    summary(dataset)
  })
  
  # Show the first "n" observations ----
  # The output$view depends on both the databaseInput reactive
  # expression and input$obs, so it will be re-executed whenever
  # input$dataset or input$obs is changed
  output$view <- renderTable({
    head(datasetInput(), n = input$obs)
  })
  
}

# Create Shiny app ----
shinyApp(ui, server)



ui <- fluidPage(
  h2("Putting things together", style = "color:red"),
  h5("Plots from the mtcars data table" , style = "color:blue"),
  selectInput("var1", "Variable 1", choices = names(mtcars)),
  selectInput("var2", "Variable 2", choices = names(mtcars)),
  
  mainPanel(
  plotOutput(outputId = "Scatterplot"),
  plotOutput(outputId = "Histogramplotvar1"),
  plotOutput(outputId = "Histogramplotvar2")
     )
)
server <- function(input, output) {
  output$Scatterplot <- renderPlot({
    ggplot(mtcars, aes(x = .data[[input$var1]], y = .data[[input$var2]])) +
      geom_point(color = "blue") +
      geom_smooth(method = lm, color = "red", se = FALSE) +
      ggtitle("Mtcars Scatter Plot")
  })
  
  output$Histogramplotvar1 <- renderPlot({
    ggplot(mtcars, aes(x = .data[[input$var1]])) +
      geom_histogram(fill = "red")
  })
  
  
  output$Histogramplotvar2 <- renderPlot({
    ggplot(mtcars, aes(x = .data[[input$var2]])) +
      geom_histogram(fill = "blue")
  })
  
}

shinyApp(ui = ui, server = server)





# uniform color change in the background

library(shiny)
install.packages("shinyWidgets")
library(shinyWidgets)


ui <- fluidPage(
  tags$h2("James Dickens, PhD"),
  h3("FINAL EXAM Shiny App"),
  setBackgroundColor("yellow")
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



# Creating Tabs


#  Shiny Example using tabs

ui <- fluidPage(
  headerPanel (title = "Shiny Tabset Example"),
  sidebarLayout(
    sidebarPanel(
      selectInput("vars", "Iris variables", choices = names(iris))
      
    ),
    
    
    mainPanel(
      tabsetPanel(type = "tab" ,
                  tabPanel("Data", tableOutput("iris")),
                  tabPanel("Summary" , verbatimTextOutput("summ")),
                  tabPanel("Plot", plotOutput("plot"))
                  
      )
    )
    
  )
)



library(shiny)

server <- function(input,output) {
  output$iris <- renderTable({
    iris        #[input$ngear]    
    
  })
  
  output$summ <- renderPrint({
    summary(iris)    #[input$ngear])   
    
  })
  
  output$plot <- renderPlot({
    ggplot(iris, aes(x = .data[[input$vars]])) +
      geom_boxplot(fill = "yellow", color = "green")
    
    #boxplot(mpg~input$ngear, data = c(mtcars$cyl,mtcars$am,
    #   mtcars$gear))
  })
}


shinyApp(ui = ui, server = server)





ui <- fluidPage(
  headerPanel (title = "Shiny Tabset Example"),
  sidebarLayout(
    sidebarPanel(
      selectInput("ngear", "Select the gear number", c("Cylinders" =
                      "cyl", "Transmission" = "am", "Gears" = "gear"))
    ),
    
    mainPanel(
      tabsetPanel(type = "tab" ,
                  tabPanel("Data", tableOutput("mtcars")),
                  tabPanel("Summary" , verbatimTextOutput("summ")),
                  tabPanel("Plot", plotOutput("plot"))
                  
    )
  )
    
)
)



library(shiny)

server <- function(input,output) {
  output$mtcars <- renderTable({
    mtcars        #[input$ngear]    
    
  })
  
  output$summ <- renderPrint({
    summary(mtcars)    #[input$ngear])   
    
  })
  
  output$plot <- renderPlot({
   with(mtcars, boxplot(mpg~gear))
    #boxplot(mpg~input$ngear, data = c(mtcars$cyl,mtcars$am,
                 #   mtcars$gear))
  })
}


shinyApp(ui = ui, server = server)





q()
y



