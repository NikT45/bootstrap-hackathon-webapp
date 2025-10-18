from flask import Flask, request, jsonify
from flask_cors import CORS
from openai import OpenAI
import os 
import json 
# remove ts
from typing import List, Dict, Any
from dotenv import load_dotenv
   
   # Load environment variables
load_dotenv()

app = Flask(__name__)
CORS(app)  # Enable CORS for all routes


# Recieve emotions and transcriptions from the frontend ]
# Recieve the eval metric (what are we evaluating the conversation on?)
# Return portions of the conversation related to the eval metric, and classify them in chess terms. 
def analyze_conversation_response(emotions, transcriptions, eval_metric):
    try:
        print(f"🔑 OpenAI API Key exists: {bool(os.getenv('OPENAI_API_KEY'))}")
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
    
    IMPORTANT: At the end of your analysis, provide a numerical score from 0-100 where:
    - 0-20: Aggressive/Defensive (poor performance, major mistakes)
    - 21-40: Dubious moves (questionable choices, awkward timing)
    - 41-60: Tactical/Positional (strategic but not exceptional)
    - 61-80: Good moves (solid performance, good responses)
    - 81-100: Excellent moves (outstanding performance, perfect responses)
    
    Format your response as:
    ANALYSIS: [your detailed analysis here]
    SCORE: [number between 0-100]
    """
        conversation_analysis = "\n".join([f"Speaker{turn['speaker']}: {turn['text']}" for turn in transcriptions])
        print(f"📝 Conversation analysis: {conversation_analysis}")
        
        response = client.chat.completions.create(
            model = "gpt-4o-mini",
            messages = [
                {"role":"system", "content":context},
                {"role":"user", "content": f"Analyze the following conversation:\n\n {conversation_analysis}"}
            ],
            # Temperature is the randomness of the response, 0.0 is the most deterministic, 1.0 is the most random
            temperature = 0.2
        )
        return response.choices[0].message.content
    except Exception as e:
        print(f"❌ Error in analyze_conversation_response: {str(e)}")
        return f"ANALYSIS: Error analyzing conversation: {str(e)}\nSCORE: 50"
        
@app.route('/analyze_conversation', methods=['POST'])
def analyze_conversation():
    try:
        print("📥 Received request to /analyze_conversation")
        data = request.get_json()
        print(f"📋 Request data: {data}")
        
        emotions = data.get('emotions', [])
        transcriptions = data.get('transcriptions', [])
        eval_metric = data.get('eval_metric', 'general conversation')
        
        print(f"🎭 Emotions: {emotions}")
        print(f"💬 Transcriptions: {transcriptions}")
        print(f"📊 Eval metric: {eval_metric}")

        response_text = analyze_conversation_response(emotions, transcriptions, eval_metric)
        print(f"🤖 GPT Response: {response_text}")
        
        # Parse the response to extract analysis and score
        lines = response_text.split('\n')
        analysis = ""
        score = 50  # Default score if parsing fails
        
        for line in lines:
            if line.startswith('ANALYSIS:'):
                analysis = line.replace('ANALYSIS:', '').strip()
            elif line.startswith('SCORE:'):
                try:
                    score = int(line.replace('SCORE:', '').strip())
                    # Ensure score is within valid range
                    score = max(0, min(100, score))
                except ValueError:
                    score = 50  # Default if parsing fails
        
        # If no ANALYSIS: line found, use the entire response as analysis
        if not analysis:
            analysis = response_text
        
        print(f"✅ Returning response - Score: {score}, Analysis: {analysis[:100]}...")
        return jsonify({
            'success': True, 
            'analysis': analysis, 
            'score': score,
            'eval_metric': eval_metric
        })
    except Exception as e:
        print(f"❌ Error in analyze_conversation endpoint: {str(e)}")
        print(f"❌ Error type: {type(e)}")
        import traceback
        print(f"❌ Traceback: {traceback.format_exc()}")
        return jsonify({'success': False, 'error': str(e)}), 500

# Progress bar value (score) is now included in the analyze_conversation endpoint



if __name__ == '__main__':
    app.run(debug=True, port=5000)
    
    






