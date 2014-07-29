#define _POSIX_C_SOURCE 1
#include <stdio.h>
#include <stdlib.h>
#include <errno.h>
#include <string.h>
#include <limits.h>
#include <getopt.h>
#include <arpa/inet.h> //htons
#include <math.h> //ceil

#include "libsndfile/src/sndfile.h"


const char *HEADER_MSG =
    "Convert audio file to waveform data for Outwave.js viewer\n"
    "\n"
    "Reads an audio file and creates a file containing downsampled binary data\n"
    "suitable for loading in the web viewer\n"
    "\n"
    "Fore supported formats see http://www.mega-nerd.com/libsndfile/\n";

/**
 * Napoveda
 */
const char *USAGE_MSG=
    "\n"
    "Usage: outwave [options] [input] output\n"
    "\n"
    "input: filename of wave file, standard input pipe is used if omitted or -\n"
    "output: filename of output datafile, or - for standard output\n"
    "\n"
    "Options: \n"
    "--samplerate, -r      sample rate of output\n"
    "                          If larger than the sample rate of input,\n"
    "                          sample rate of input is used.\n"
    "--samplesize, -s      sample size\n"
    "                          8 or 16 (bits)\n"
    "--mono, -m                mix all channels into one\n"
	"--summary1, -1        summary limit 1, power of 2\n"
	"--summary2, -2        summary limit 2, power of 2\n"
	"--nosum, -n        disable summaries2\n"
	"\n"
	"Defaults:\n"
	"Sample rate: 441 Hz\n"
	"Sample size: 8 bits\n"
	"Summary 1: 128\n"
	"Summary 2: 16384\n"
	"\n"
	"Exit codes:\n"
	"0 - ok\n"
	"1 - user error\n"
	"2 - I/O error\n";


struct args{
	char *input;
	char *output;
	int samplerate;
	int samplesize;
	int summary1;
	int summary2;
	int mono;
	int nosum;
} args = {
	.input = NULL,
	.output = NULL,
	.samplerate = 441,
	.samplesize = 8,
	.summary1 = 128,
	.summary2 = 16384,
	.mono = 0,
	.nosum = 0
};




struct option long_options[] =
 {
   {"samplerate",  required_argument,    NULL, 'r'},
   {"samplesize",  required_argument,    NULL, 's'},
   {"summary1",    required_argument,    NULL, '1'},
   {"summary2",    required_argument,    NULL, '2'},
   {"mono",        no_argument,          NULL, 'm'},
   {"nosum",       no_argument,          NULL, 'n'},   
   {"help",        no_argument,          NULL, 'h'},
   {0, 0, 0, 0}
 };



int is_power_of_2(int x){
	return (x != 0) && ((x & (x - 1)) == 0);
}

unsigned int log2int( unsigned int x )
{
  unsigned int val = 0 ;
  while( x>>=1 ) val++;  // eg x=63 (111111), log2Val=5
  return val;
}

int load_args(int argc,char **argv, struct args *args){
	int c;


	int result = 0;

	int option_index = 0;

	while((c = getopt_long (argc, argv, "hr:s:1:2:mn",long_options, &option_index)) != -1){
        switch (c)
        {
        case 0:
           /* If this option set a flag, do nothing else now. */
         	break;
        case 'h':
         	fprintf(stderr,"%s",HEADER_MSG);
         	return 1;
         	break;
 
        case 'r':
         	if(sscanf(optarg,"%d",&(args->samplerate)) != 1){
         		result = 1;
         		fprintf(stderr,"Invalid argument for parameter --samplerate\n");
         	}
           break;
 
        case 's':
         	if(sscanf(optarg,"%d",&(args->samplesize)) != 1){
         		result = 1;
         		fprintf(stderr,"Invalid argument for parameter --samplesize\n");
         	} 
         	if(args->samplesize != 8 && args->samplesize != 16){
         		result = 1;
         		fprintf(stderr,"--samplesize has to be 8 or 16\n");         		
         	}
         	break;
        case '1':
         	if(sscanf(optarg,"%d",&(args->summary1)) != 1 || !is_power_of_2(args->summary1)){
         		result = 1;
         		fprintf(stderr,"Invalid argument for parameter --summary1\n");
         	} 
            break; 
        case '2':
         	if(sscanf(optarg,"%d",&(args->summary2)) != 1 || !is_power_of_2(args->summary2)){
         		result = 1;
         		fprintf(stderr,"Invalid argument for parameter --summary2\n");
         	} 
            break;
        case 'n':
        	args->nosum = 1; 
        	break;
        case 'm':
        	args->mono = 1;
        	break;
        case '?':
         	result=1;
           /* getopt_long already printed an error message. */
           break;
 
        default:
           
           break;
         }	

	}

	if(optind >= argc){
 		result = 1;
 		fprintf(stderr,"Output argument is required\n");
 		return result;
	}

	args->output = argv[optind];

	optind++;

	if(optind < argc){
		args->input = args->output;
		args->output = argv[optind];
	}

	if(strcmp(args->output,"-")==0){ // - for output pipe
		args->output = NULL;
	}

	if(args->input!= NULL && strcmp(args->input,"-")==0){ // - for input pipe
		args->input = NULL;
	}


    return result;

}


/*Reset max and min*/
void reset_bounds(short int min[], short int max[], int cnt){
	for(int i=0;i<cnt;i++){
		max[i] = SHRT_MIN;
		min[i] = SHRT_MAX;
	}
}

/*Add values to max and min arrays*/
void add_bounds(short int min[], short int max[], short int val[], int cnt){
	for(int i = 0; i < cnt; i++){
		if(val[i] > max[i]){max[i] = val[i];}
		if(val[i] < min[i]){min[i] = val[i];}
	}	
}


void write_sample(short int s, int sample_size, FILE * out){
	if(sample_size == 16){
		int16_t w = htons(s); // convert to big endian
		fwrite(&w,sizeof(int16_t),1,out);
	}else{
		int8_t w = s / 256;
		fwrite(&w,sizeof(int8_t),1,out);
	}
}

void write_frame(short int min[], short int max[], int channels, FILE *out, int mix, int sample_size){

	if(mix){
		short int smax = 0;
		short int smin = 0;
		for(int i=0; i<channels;i++){
			smax += max[i]/channels;
			smin += min[i]/channels;
		}
		write_sample(smin,sample_size,out);
		write_sample(smax,sample_size,out);		

	}else{
		for(int i=0; i<channels;i++){
			write_sample(min[i],sample_size,out);
			write_sample(max[i],sample_size,out);
		}
	}
}




/*req_frames - output should be rounded up to req_frames*/
unsigned int downsample(SNDFILE *snd,FILE * out, double fpf ,int channels,int mix, int sample_size, int sum_enabled, int summary1, int summary2){

	short int max[channels];
	short int min[channels];

	short int sum1max[channels];
	short int sum1min[channels];

	short int sum2max[channels];
	short int sum2min[channels];


	int items = 4086;

	short int buf[items * channels];

	int got;
	int in_frames=0; //read frames

	unsigned int out_frames=1; // written frames

	reset_bounds(min,max,channels);

	reset_bounds(sum1max,sum1min,channels);

	reset_bounds(sum2max,sum2min,channels);


	printf("Downsampling factor: %f\n",fpf);


	int next_output = ceil(fpf);

	int next_m = 0;

	int reset = 1;

	while((got = sf_readf_short(snd,buf,items))>0){

		for(int i=0;i<got;i++){

			for(int c = 0; c < channels; c++){
				short int val = buf[i * channels + c];
				if(val > max[c]){max[c] = val;}
				if(val < min[c]){min[c] = val;}
				reset = 0;
			}

			in_frames++;

			if(in_frames == next_output){


				write_frame(min,max,channels,out,mix,sample_size);



				if(sum_enabled){

					add_bounds(sum1min, sum1max, min, channels);
					add_bounds(sum1min, sum1max, max, channels);

					add_bounds(sum2min, sum2max, min, channels);
					add_bounds(sum2min, sum2max, max, channels);

					//add stuff to summary

					if(out_frames % summary1 == 0){
						write_frame(sum1min,sum1max,channels,out,mix,sample_size);
						reset_bounds(sum1min,sum1max,channels);
					}

					if(out_frames % summary2 == 0){
						write_frame(sum2min,sum2max,channels,out,mix,sample_size);
						reset_bounds(sum2min,sum2max,channels);
					}


				}

				reset_bounds(min,max,channels);
				reset = 1;

				//add this num to new bounds

				if(next_m){
	        		for(int c = 0; c < channels; c++){
	        			short int val = buf[i * channels + c];
	        			if(val > max[c]){max[c] = val;}
	        			if(val < min[c]){min[c] = val;}
	        			reset = 0;
	        		}
				}
				out_frames++;

				next_output = ceil((out_frames)*fpf);

				next_m = (ceil((out_frames)*fpf) != ((out_frames)*fpf));



			}



		}

	}

	fprintf(stderr,"Total in: %d\n",in_frames);
	fprintf(stderr,"Total out: %d\n",out_frames);

	if(!reset){ //is there more data?
		write_frame(min,max,channels,out,mix,sample_size); //add last maxmin

		out_frames++;

		if(sum_enabled){
		
			add_bounds(sum1min, sum1max, min, channels);
			add_bounds(sum1min, sum1max, max, channels);

			add_bounds(sum2min, sum2max, min, channels);
			add_bounds(sum2min, sum2max, max, channels);

			//add stuff to summary

			if(out_frames % summary1 == 0){
				write_frame(sum1min,sum1max,channels,out,mix,sample_size);
			}

			if(out_frames % summary2 == 0){
				write_frame(sum2min,sum2max,channels,out,mix,sample_size);
			}


		}

	}


	return out_frames-1;


}



/*

Exit values:	0 - ok
				1 - user error
				2 - I/O error
*/
int main(int argc, char **argv)
{

	if(load_args(argc,argv,&args)){
		fprintf(stderr,"%s",USAGE_MSG);
		exit(1);
	}

	FILE * input_f;
	FILE * output_f;

	int input_fd;
	if(args.input != NULL){
		input_f = fopen(args.input,"rb");
		if(input_f == NULL){
			fprintf(stderr,"Cannot open input file: %s\n",strerror(errno));
			exit(2);
		}
		input_fd = fileno(input_f);
	}else{
		input_fd = fileno(stdin);
	}

	if(args.output !=NULL){
		output_f = fopen(args.output,"wb");
		if(output_f == NULL){
			if(args.input != NULL){
				fclose(input_f);
			}
			fprintf(stderr,"Cannot open output file: %s\n",strerror(errno));
			exit(2);
		}		
	}else{
		output_f = stdout;
	}



	SNDFILE* snd;
	SF_INFO sfinfo ;

	snd = sf_open_fd(input_fd,SFM_READ,&sfinfo,0);
	int result = 0;
	if(snd == NULL){
		result = 2;
		fprintf(stderr,"Cannot open input file: %s\n",sf_strerror(snd));
	}else{
		/*
		   typedef struct
       {   sf_count_t  frames ;
           int         samplerate ;
           int         channels ;
           int         format ;
           int         sections ;
           int         seekable ;
       } SF_INFO ;*/

        printf("Frames: %ld\n",sfinfo.frames);
        printf("Sample rate: %d\n",sfinfo.samplerate);

        double fpf = sfinfo.samplerate/(double)args.samplerate;

        uint8_t s_version = 2;
        if(args.nosum){
        	s_version = 1;
        }
        fwrite(&s_version,sizeof(s_version),1,output_f);         


        uint8_t s_channels = sfinfo.channels;
        if(args.mono){
        	s_channels = 1;
        }

        fwrite(&s_channels,sizeof(s_channels),1,output_f);  

        uint8_t s_samplesize = args.samplesize/8;
        fwrite(&s_samplesize,sizeof(s_samplesize),1,output_f);        

        uint32_t s_rate = htonl(args.samplerate); // to big endian
        fwrite(&s_rate,sizeof(s_rate),1,output_f);

        if(s_version == 2){
        	uint8_t s_sum1 = log2int(args.summary1);
        	fwrite(&s_sum1,sizeof(s_sum1),1,output_f);       


        	uint8_t s_sum2 = log2int(args.summary2);
        	fwrite(&s_sum2,sizeof(s_sum2),1,output_f);  
        }


        uint32_t frames = downsample(snd,output_f, fpf ,sfinfo.channels, args.mono, args.samplesize, !args.nosum, args.summary1, args.summary2);
        if(s_version == 2){
        	frames = htonl(frames); // to big endian
        	fwrite(&frames,sizeof(frames),1,output_f); 	
        }
  	}


	if(snd){
		sf_close(snd);
	}
 
	if(args.input != NULL){
		fclose(input_f);
	}

	if(args.output != NULL){
		fclose(output_f);
	}

	exit(result);

}
