import { useState } from 'react';
import classroom from '../assets/social/backgrounds/classroom.svg';
import community from '../assets/social/backgrounds/community.svg';
import home from '../assets/social/backgrounds/home.svg';
import playground from '../assets/social/backgrounds/playground.svg';
import child from '../assets/social/characters/child.svg';
import person from '../assets/social/characters/person.svg';

const backgrounds = { classroom, community, home, playground };

export default function SocialScenarioScene({ scenario, selectedObjectId, onSelectObject, interactive = true }) {
  const [failedBackgrounds, setFailedBackgrounds] = useState({});
  const background = backgrounds[scenario.background];
  const people = scenario.characters || [];

  return (
    <section className="social-scene" aria-label={`${scenario.title} picture scene`}>
      {background && !failedBackgrounds[scenario.background] && (
        <img
          className="social-scene-background"
          src={background}
          alt=""
          aria-hidden="true"
          onError={() => setFailedBackgrounds((current) => ({ ...current, [scenario.background]: true }))}
        />
      )}
      <div className="social-scene-caption">
        <span>{scenario.category}</span>
        <strong>{scenario.title}</strong>
      </div>
      <div className="social-scene-people">
        {people.map((character) => interactive ? (
          <button
            type="button"
            key={character.id}
            className={`social-scene-person ${selectedObjectId === character.id ? 'selected' : ''}`}
            aria-pressed={selectedObjectId === character.id}
            aria-label={`${character.label}${selectedObjectId === character.id ? ', selected' : ''}`}
            onClick={() => onSelectObject(character)}
          >
            <img src={character.id === 'child' ? child : person} alt="" aria-hidden="true" />
            <span>{character.label}</span>
          </button>
        ) : (
          <div className="social-scene-person" key={character.id}>
            <img src={character.id === 'child' ? child : person} alt="" aria-hidden="true" />
            <span>{character.label}</span>
          </div>
        ))}
      </div>
      <div className="social-scene-objects" aria-label="Tap a picture in the scene">
        {(scenario.objects || []).map((object) => interactive ? (
          <button
            type="button"
            key={object.id}
            className={`social-scene-object ${selectedObjectId === object.id ? 'selected' : ''}`}
            aria-pressed={selectedObjectId === object.id}
            aria-label={`${object.label}${selectedObjectId === object.id ? ', selected' : ''}`}
            onClick={() => onSelectObject(object)}
          >
            <span aria-hidden="true">{object.icon}</span>
            <small>{object.label}</small>
          </button>
        ) : (
          <div className="social-scene-object static" key={object.id}>
            <span aria-hidden="true">{object.icon}</span>
            <small>{object.label}</small>
          </div>
        ))}
      </div>
      {scenario.emotion && (
        <div className="social-scene-emotion" aria-label={`The character may feel ${scenario.emotion.label}`}>
          <span aria-hidden="true">{scenario.emotion.icon}</span>
          <small>{scenario.emotion.label}</small>
        </div>
      )}
    </section>
  );
}
