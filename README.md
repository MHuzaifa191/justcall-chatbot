# JustCall Chatbot

This project is a chatbot server built with Express.js that integrates with the JustCall API and OpenAI's GPT-4 model to handle SMS messages and generate responses.

## Features

- Receives incoming SMS messages via the JustCall API.
- Uses OpenAI's GPT-4 model to generate responses based on conversation history.
- Sends responses back via the JustCall API.
- Maintains conversation history in memory (suitable for development; use a database for production).

## Prerequisites

- Node.js (v14 or higher)
- npm (v6 or higher)

## Installation

1. Clone the repository:

    ```sh
    git clone https://github.com/MHuzaifa191/justcall-chatbot.git
    cd justcall-chatbot
    ```

2. Install dependencies:

    ```sh
    npm install
    ```

3. Create a `.env` file in the root directory and add the following environment variables:

    ```env
    PORT=3000
    OPENAI_API_KEY=your_openai_api_key
    OPENAI_ASSISTANT_KEY=your_openai_assistant_key
    JUSTCALL_API_KEY=your_justcall_api_key
    JUSTCALL_API_SECRET=your_justcall_api_secret
    JUSTCALL_FROM_NUMBER=your_justcall_from_number
    ```

### Development

To create the js file:

```sh
npx tsc
```

To run the project:
```sh
cd dist
node index.js
```