from flask import Flask, request, jsonify
from openai import OpenAI
import os 
import json 
# remove ts
from typing import List, Dict, Any
from dotenv import load_dotenv
   
   # Load environment variables
load_dotenv()

app = Flask(__name__)


# Recieve emotions and transcriptions from the frontend ]
# Recieve the eval metric (what are we evaluating the conversation on?)
# Return portions of the conversation related to the eval metric, and classify them in chess terms. 
def analyze_conversation_response(emotions, transcriptions, eval_metric):
    # Initialize the OpenAI client
    client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))
    context = f"""
    You are analyzing a conversation in chess terms. The situation is: {eval_metric}
    
    Speaker 0 is the person being evaluated. Speaker 1's emotions: {emotions}
    
    Analyze each significant exchange and classify it as:
    - BLUNDER: Major social mistake, offensive, inappropriate
    - EXCELLENT MOVE: Perfect response, great question, smooth
    - DUBIOUS MOVE: Questionable choice, awkward, poor timing
    - TACTICAL: Strategic response, calculated approach
    - POSITIONAL: Building rapport, setting up opportunities
    - DEFENSIVE: Recovering from mistake, damage control
    - AGGRESSIVE: Direct approach, pushing boundaries appropriately
    
    For each classification, explain:
    1. What specific part of the conversation led to this classification
    2. Why it's good/bad in the context of {eval_metric}
    3. What emotions from speaker 1 might have influenced this
    """
    conversation_analysis = "\n".join([f"Speaker{turn['speaker']}: {turn['text']}" for turn in transcriptions])
    response = client.chat.completions.create(
        model = "gpt-5-nano",
        messages = [
            {"role":"system", "content":context},
            {"role":"user", "content": f"Analyze the following conversation:\n\n {conversation_analysis}"}
        ],
        # Temperature is the randomness of the response, 0.0 is the most deterministic, 1.0 is the most random
        temperature = 0.3
    )
    return response.choices[0].message.content
        
@app.route('/analyze_conversation', methods=['POST'])
def analyze_conversation():
    try:
        data = request.get_json()
        emotions = data.get('emotions', [])
        transcriptions = data.get('transcriptions', [])
        eval_metric = data.get('eval_metric', 'general conversation')

        analysis = analyze_conversation_response(emotions, transcriptions, eval_metric)
        return jsonify({'success': True, 'analysis': analysis, 'eval_metric': eval_metric})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500



if __name__ == '__main__':
    app.run(debug=True, port=5000)
    
    






