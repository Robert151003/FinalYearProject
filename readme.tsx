{/*
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
            In this approach, each participant's video feed is processed individually on their own device or through a WebSocket connection to a server.

            Advantages:
            Privacy: Each participant's video is processed locally or in a secure environment, minimizing the risk of exposure.
            Scalability: No single point of failure; each participant's processing is independent.
            Real-Time Processing: Local processing can reduce latency and improve response times.
            Disadvantages:
            Performance: Requires significant resources on each participant's device, which might not be feasible for lower-end hardware.
            Complexity: Each participant needs to have the necessary software or library to process the video, which can complicate deployment.
            Bandwidth: May increase bandwidth usage if video frames are sent to a server for processing.


*/}