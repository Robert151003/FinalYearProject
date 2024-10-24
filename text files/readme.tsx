{/*
    Building the app - https://www.youtube.com/watch?v=R8CIO1DZ2b8&sttick=0
    Implementing sign language detection into the app using tensorflow.js - https://www.youtube.com/watch?v=ZTSRZt04JkY

    This is the readme - only for me view - must delete before submission

    I use clerk to authorise a login:
        It allows up to 10,000 monthly active users for free
        It allows a custom domain
        Website is hosted through clerk
        2 cents per user after thousanth user
        Keys are stored in env.local

        The layout is wrapped in a clerk provider to check if the user is logged in, and if not puts them onto login page
        
        
        Clerk is a tool that helps manage user authentication and user management within applications, especially for modern web apps. It provides a range of features for handling user sign-ups, logins, and account management. When you integrate Clerk with your application, it acts as middleware in several key ways:

        Authentication: Clerk manages user authentication processes, including handling login, registration, and password recovery. It ensures that only authorized users can access certain parts of your application.

        Session Management: Clerk handles session management and user state, ensuring that users remain logged in and that their session information is securely maintained.

        User Data: Clerk stores and manages user profiles and other related data. It can handle user attributes, preferences, and other details needed for personalized experiences.

        Security: Clerk implements security best practices, including data encryption and secure token management, to protect user data and interactions.

        Integration: As middleware, Clerk integrates with your application's frontend and backend, providing APIs and SDKs to easily connect with your existing infrastructure and workflows.
            

    Stream client provider is used to deal with all of the calling functionality:

        Individual Processing for Each Participant

        In order to implement the sign language detection i have tried multiple different ways:
            Websockets to scan and edit images then pass them back
            Replacing the video component in videopreview with my own
            Using a python script to scan the video
            Using python to create a virtual camera
            Using python to host the users feed to a localhost page and getting that users video feed from there
            Training the model in python, downloading ubuntu and converting the model via linux based to a tensorflow.js model
            Finally i came up with a solution, my model is made and trained in tensorflow.js using typescript. This is then run on the page to scan the video and detect any sign language

    
    Model training:
        The model is trained using tensorflow.js
        The model is trained using a convolutional neural network

        On the first ever train:
            Image sizes processed to 32 x 32 from 640 x 480 for efficiency
            20 Epochs were used and found out that 15 were the necesary, batch size of 32 over currently 900 images of different letters of the alphabet
            losses at this point were 0.0007ish

*/}