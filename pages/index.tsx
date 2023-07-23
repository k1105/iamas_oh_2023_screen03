import { useCallback, useRef, useState, useEffect } from "react";
import "@tensorflow/tfjs";
import * as handPoseDetection from "@tensorflow-models/hand-pose-detection";
import Webcam from "react-webcam";
import { ConsentForm } from "../sketch/ConsentForm";
import { Interaction020 } from "../sketch/Interaction020";
import { Interaction018 } from "../sketch/Interaction018";
import { PixelInput } from "@tensorflow-models/hand-pose-detection/dist/shared/calculators/interfaces/common_interfaces";
import { ScreenSaver } from "../sketch/ScreenSaver";
import Head from "next/head";

export default function App() {
  const webcamRef = useRef<Webcam>(null);
  const modelRef = useRef<null | handPoseDetection.HandDetector>(null);
  const predictionsRef = useRef<handPoseDetection.Hand[]>([]);
  const requestRef = useRef<null | number>(null);
  const [ready, setReady] = useState<boolean>(false);
  const [scene, setScene] = useState<number>(0);
  const [consented, setConsented] = useState<boolean>(false);
  const [lost, setLost] = useState<boolean>(true);
  const headerTexts = [
    { eng: "Interaction020", text: "界面を確かめる" },
    { eng: "Interaction018", text: "界面を確かめる-02" },
  ];

  const lostCountRef = useRef(0);
  const sketchContainerRef = useRef<HTMLDivElement>(null);
  const timer = 3600000;

  const capture = useCallback(async () => {
    if (typeof webcamRef.current && modelRef.current) {
      //webcamとmodelのインスタンスが生成されていたら
      const predictions = await modelRef.current.estimateHands(
        (webcamRef.current as Webcam).getCanvas() as PixelInput
      ); //webcamの現時点でのフレームを取得し、ポーズ推定の結果をpredictionsに非同期で格納

      if (predictions) {
        if (
          predictions.length > 0 &&
          predictions.every((hand) => {
            return hand.score > 0.75;
          })
        ) {
          predictionsRef.current = predictions;
          lostCountRef.current = 0;
          setLost(false);
        } else {
          lostCountRef.current++;
        }

        if (lostCountRef.current > 5) {
          predictionsRef.current = [];
        }
        if (lostCountRef.current > 200) {
          setConsented(false);
          setLost(true);
        }
      }
    }

    if (ready) {
      requestRef.current = requestAnimationFrame(capture); //captureを実施
    }
  }, [ready]);

  useEffect(() => {
    const load = async () => {
      const model = handPoseDetection.SupportedModels.MediaPipeHands;
      const detectorConfig = {
        runtime: "tfjs",
        modelType: "full",
      } as handPoseDetection.MediaPipeHandsTfjsModelConfig;
      modelRef.current = await handPoseDetection.createDetector(
        model,
        detectorConfig
      );
    };

    load();

    setReady(true);
    setInterval("location.reload()", timer);
  }, []);

  useEffect(() => {
    if (ready) {
      requestRef.current = requestAnimationFrame(capture);
    }
  }, [capture, ready]);

  return (
    <>
      <Head>
        <title>Screen03 | IAMAS OPHENHOUSE 2023</title>
        <meta name="description" content="Generated by create next app" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      {ready && (
        <>
          <div ref={sketchContainerRef}>
            {(() => {
              if (lost) {
                return <ScreenSaver />;
              } else {
                if (!consented) {
                  return (
                    <ConsentForm
                      handpose={predictionsRef}
                      setConsented={setConsented}
                    />
                  );
                } else {
                  if (scene == 0) {
                    return (
                      <Interaction020
                        handpose={predictionsRef}
                        scene={scene}
                        setScene={setScene}
                      />
                    );
                  } else if (scene == 1) {
                    return (
                      <Interaction018
                        handpose={predictionsRef}
                        scene={scene}
                        setScene={setScene}
                      />
                    );
                  }
                }
              }
            })()}
          </div>
        </>
      )}
      {lost ? (
        <></>
      ) : (
        <div style={{ position: "absolute", width: "300px", top: "30px" }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              paddingLeft: "1rem",
              height: "2.5rem",
            }}
          >
            <p style={{ fontWeight: "bold", lineHeight: "2rem" }}>
              {consented ? headerTexts[scene].eng : "Consent Form"}
            </p>
            <p style={{ fontFamily: "monospace", fontSize: "1.1rem" }}>
              {consented ? headerTexts[scene].text : "実験協力のおねがい"}
            </p>
          </div>
          <hr />
          {consented ? (
            <p style={{ textAlign: "right" }}>{scene + 1} / 2</p>
          ) : (
            <></>
          )}
        </div>
      )}

      <div
        style={{
          position: "absolute",
          right: 0,
          top: 0,
          opacity: 0, //debug -> opacity: 1
        }}
      >
        <Webcam //手指の動きを取得するのに必要なカメラ映像
          width="400"
          height="300"
          mirrored
          id="webcam"
          audio={false}
          ref={webcamRef}
          screenshotFormat="image/jpeg"
        />
      </div>
    </>
  );
}
